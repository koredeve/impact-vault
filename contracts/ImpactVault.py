# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

STATUS_FUNDING = "funding"
STATUS_ACTIVE = "active"
STATUS_COMPLETED = "completed"
STATUS_CANCELLED = "cancelled"

MILESTONE_PENDING = "pending"
MILESTONE_SUBMITTED = "submitted"
MILESTONE_APPROVED = "approved"
MILESTONE_REJECTED = "rejected"

TOTAL_BPS = 10000


def _handle_leader_error(leaders_res, leader_fn) -> bool:
	leader_msg = leaders_res.message if hasattr(leaders_res, "message") else ""
	try:
		leader_fn()
		return False
	except gl.vm.UserError as e:
		validator_msg = e.message if hasattr(e, "message") else str(e)
		if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
			return validator_msg == leader_msg
		if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
			return True
		return False
	except Exception:
		return False


@allow_storage
@dataclass
class Milestone:
	title: str
	criteria: str
	bps: u256
	status: str
	deliverable_desc: str
	evidence_urls: DynArray[str]
	evaluation_notes: str


@allow_storage
@dataclass
class Campaign:
	creator: Address
	beneficiary: Address
	title: str
	description: str
	target_amount: u256
	total_funded: u256
	total_released: u256
	current_milestone_index: u256
	total_milestones: u256
	status: str


class ImpactVault(gl.Contract):
	campaigns: TreeMap[str, Campaign]
	campaign_milestones: TreeMap[str, DynArray[Milestone]]
	campaign_backers: TreeMap[str, u256]
	credits: TreeMap[Address, u256]
	campaign_ids: DynArray[str]

	def __init__(self) -> None:
		pass

	def _get_campaign(self, campaign_id: str) -> Campaign:
		cid = str(campaign_id).strip()
		camp = self.campaigns.get(cid)
		if camp is None:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Unknown campaign id: {cid}")
		return camp

	@gl.public.view
	def total_campaigns(self) -> u256:
		return u256(len(self.campaign_ids))

	@gl.public.view
	def get_campaign_ids(self) -> dict:
		ids = []
		for i in range(len(self.campaign_ids)):
			ids.append(str(self.campaign_ids[i]))
		return {"ids": ids}

	@gl.public.view
	def get_campaign(self, campaign_id: str) -> dict:
		c = self._get_campaign(campaign_id)
		return {
			"creator": str(c.creator),
			"beneficiary": str(c.beneficiary),
			"title": c.title,
			"description": c.description,
			"target_amount": c.target_amount,
			"total_funded": c.total_funded,
			"total_released": c.total_released,
			"current_milestone_index": c.current_milestone_index,
			"total_milestones": c.total_milestones,
			"status": c.status,
		}

	@gl.public.view
	def get_milestones_count(self, campaign_id: str) -> u256:
		self._get_campaign(campaign_id)
		ms = self.campaign_milestones.get(str(campaign_id).strip())
		if ms is None:
			return u256(0)
		return u256(len(ms))

	@gl.public.view
	def get_milestone(self, campaign_id: str, milestone_idx: u256) -> dict:
		self._get_campaign(campaign_id)
		cid = str(campaign_id).strip()
		ms = self.campaign_milestones.get(cid)
		idx = int(milestone_idx)
		if ms is None or idx < 0 or idx >= len(ms):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone index out of bounds")
		m = ms[idx]
		urls = []
		for i in range(len(m.evidence_urls)):
			urls.append(str(m.evidence_urls[i]))
		return {
			"title": m.title,
			"criteria": m.criteria,
			"bps": m.bps,
			"status": m.status,
			"deliverable_desc": m.deliverable_desc,
			"evidence_urls": urls,
			"evaluation_notes": m.evaluation_notes,
		}

	@gl.public.view
	def get_backer_contribution(self, campaign_id: str, backer_addr: Address) -> u256:
		cid = str(campaign_id).strip()
		self._get_campaign(cid)
		addr_obj = Address(backer_addr) if not isinstance(backer_addr, Address) else backer_addr
		key = f"{cid}:{str(addr_obj)}"
		val = self.campaign_backers.get(key)
		return u256(0) if val is None else val

	@gl.public.view
	def get_credits(self, addr: Address) -> u256:
		a = Address(addr) if not isinstance(addr, Address) else addr
		val = self.credits.get(a)
		return u256(0) if val is None else val

	@gl.public.write
	def create_campaign(
		self,
		campaign_id: str,
		beneficiary: Address,
		title: str,
		description: str,
		target_amount: u256,
		milestone_titles: DynArray[str],
		milestone_criteria: DynArray[str],
		milestone_bps: DynArray[u256],
	) -> None:
		cid = str(campaign_id).strip()
		t = str(title).strip()
		d = str(description).strip()
		if not cid or not t or not d:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign id, title, and description must not be empty")
		if cid in self.campaigns:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign id already exists")
		if target_amount == u256(0):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Target amount must be positive")

		beneficiary_addr = Address(beneficiary) if not isinstance(beneficiary, Address) else beneficiary

		num_m = len(milestone_titles)
		if num_m == 0:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} At least one milestone is required")
		if len(milestone_criteria) != num_m or len(milestone_bps) != num_m:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone array lengths must match")

		total_bps = 0
		milestones_list = []
		for i in range(num_m):
			m_title = str(milestone_titles[i]).strip()
			m_crit = str(milestone_criteria[i]).strip()
			m_bps = int(milestone_bps[i])
			if not m_title or not m_crit:
				raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone title and criteria must not be empty")
			if m_bps <= 0:
				raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone bps must be positive")
			total_bps += m_bps
			milestones_list.append(
				Milestone(
					title=m_title,
					criteria=m_crit,
					bps=u256(m_bps),
					status=MILESTONE_PENDING,
					deliverable_desc="",
					evidence_urls=[],
					evaluation_notes="",
				)
			)

		if total_bps != TOTAL_BPS:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone bps must sum exactly to {TOTAL_BPS} (got {total_bps})")

		self.campaigns[cid] = Campaign(
			creator=gl.message.sender_address,
			beneficiary=beneficiary_addr,
			title=t,
			description=d,
			target_amount=target_amount,
			total_funded=u256(0),
			total_released=u256(0),
			current_milestone_index=u256(0),
			total_milestones=u256(num_m),
			status=STATUS_FUNDING,
		)
		self.campaign_milestones[cid] = milestones_list
		self.campaign_ids.append(cid)

	@gl.public.write.payable
	def fund_campaign(self, campaign_id: str) -> None:
		cid = str(campaign_id).strip()
		camp = self._get_campaign(cid)
		if camp.status != STATUS_FUNDING:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign is not in funding state")

		amount = gl.message.value
		if amount == u256(0):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Contribution amount must be positive")

		sender = gl.message.sender_address
		sender_obj = Address(sender) if not isinstance(sender, Address) else sender
		key = f"{cid}:{str(sender_obj)}"
		curr = self.campaign_backers.get(key)
		if curr is None:
			self.campaign_backers[key] = amount
		else:
			self.campaign_backers[key] = curr + amount

		camp.total_funded += amount

		# Transition to active if target reached
		if camp.total_funded >= camp.target_amount:
			camp.status = STATUS_ACTIVE

	@gl.public.write
	def submit_deliverable(
		self,
		campaign_id: str,
		milestone_idx: u256,
		deliverable_desc: str,
		evidence_urls: DynArray[str],
	) -> None:
		cid = str(campaign_id).strip()
		camp = self._get_campaign(cid)
		if gl.message.sender_address != camp.beneficiary and gl.message.sender_address != camp.creator:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Only beneficiary or creator may submit deliverables")
		if camp.status != STATUS_ACTIVE:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign is not in active execution state")

		idx = int(milestone_idx)
		if idx != int(camp.current_milestone_index):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Must submit deliverable for the active milestone #{camp.current_milestone_index}")

		desc = str(deliverable_desc).strip()
		if not desc:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Deliverable description must not be empty")

		clean_urls = []
		for i in range(len(evidence_urls)):
			url = str(evidence_urls[i]).strip()
			if not url.startswith("https://"):
				raise gl.vm.UserError(f"{ERROR_EXPECTED} Evidence URL must start with https://")
			clean_urls.append(url)

		ms = self.campaign_milestones[cid]
		target_m = ms[idx]
		target_m.deliverable_desc = desc
		target_m.evidence_urls = clean_urls
		target_m.status = MILESTONE_SUBMITTED

	@gl.public.write
	def evaluate_milestone(self, campaign_id: str, milestone_idx: u256) -> None:
		cid = str(campaign_id).strip()
		camp = self._get_campaign(cid)
		if camp.status != STATUS_ACTIVE:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign is not active")

		idx = int(milestone_idx)
		if idx != int(camp.current_milestone_index):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Target milestone is not the currently active milestone")

		ms = self.campaign_milestones[cid]
		m = ms[idx]
		if m.status != MILESTONE_SUBMITTED:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Milestone deliverable must be submitted before evaluation")

		criteria_text = str(m.criteria)
		desc_text = str(m.deliverable_desc)
		urls_list = [str(m.evidence_urls[i]) for i in range(len(m.evidence_urls))]
		urls_str = ", ".join(urls_list) if urls_list else "None provided"

		prompt = (
			f"You are a rigorous Web3 DAO grant evaluator.\n"
			f"Evaluate whether the submitted project deliverable satisfies the milestone acceptance criteria.\n\n"
			f"Project: {camp.title}\n"
			f"Milestone #{idx + 1}: {m.title}\n"
			f"Acceptance Criteria: {criteria_text}\n"
			f"Submitted Deliverable: {desc_text}\n"
			f"Evidence Links: {urls_str}\n\n"
			f"Instructions:\n"
			f"- If the deliverable substantively satisfies the acceptance criteria with plausible evidence, verdict is APPROVED.\n"
			f"- If the deliverable is missing, incomplete, or fails to meet criteria, verdict is REJECTED.\n\n"
			f"Respond ONLY with a valid JSON object matching this exact schema:\n"
			f'{{"verdict": "APPROVED" | "REJECTED", "confidence": 1-100, "notes": "concise rationale"}}'
		)

		def leader_fn() -> dict:
			res = gl.nondet.exec_prompt(prompt)
			if isinstance(res, dict):
				parsed = res
			else:
				try:
					parsed = json.loads(str(res))
				except Exception:
					raise gl.vm.UserError(f"{ERROR_LLM} Invalid JSON from evaluator")
			if not isinstance(parsed, dict):
				raise gl.vm.UserError(f"{ERROR_LLM} Non-dict JSON from evaluator")
			v = str(parsed.get("verdict", "")).strip().upper()
			if v not in ("APPROVED", "REJECTED"):
				raise gl.vm.UserError(f"{ERROR_LLM} Invalid verdict value: {v}")
			notes = str(parsed.get("notes", "")).strip()
			return {"verdict": v, "notes": notes}

		def validator_fn(leaders_res: gl.vm.Result) -> bool:
			if not isinstance(leaders_res, gl.vm.Return):
				return _handle_leader_error(leaders_res, leader_fn)
			try:
				leader_verdict = str(leaders_res.calldata.get("verdict", "")).strip().upper()
				fresh = leader_fn()
			except Exception:
				return False
			return leader_verdict == str(fresh.get("verdict", "")).strip().upper()

		result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
		verdict = str(result["verdict"]).upper()
		notes = str(result["notes"])

		m.evaluation_notes = notes
		if verdict == "APPROVED":
			m.status = MILESTONE_APPROVED
			# Calculate tranche release
			tranche_amount = (camp.total_funded * m.bps) // u256(TOTAL_BPS)
			camp.total_released += tranche_amount

			# Credit to beneficiary
			curr_credit = self.credits.get(camp.beneficiary)
			if curr_credit is None:
				self.credits[camp.beneficiary] = tranche_amount
			else:
				self.credits[camp.beneficiary] = curr_credit + tranche_amount

			# Advance milestone
			camp.current_milestone_index += u256(1)
			if int(camp.current_milestone_index) >= int(camp.total_milestones):
				camp.status = STATUS_COMPLETED
		else:
			m.status = MILESTONE_REJECTED

	@gl.public.write
	def cancel_campaign(self, campaign_id: str) -> None:
		cid = str(campaign_id).strip()
		camp = self._get_campaign(cid)
		if gl.message.sender_address != camp.creator:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Only creator may cancel campaign")
		if camp.status not in (STATUS_FUNDING, STATUS_ACTIVE):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Cannot cancel campaign in state: {camp.status}")
		camp.status = STATUS_CANCELLED

	@gl.public.write
	def claim_payout(self) -> None:
		sender = gl.message.sender_address
		val = self.credits.get(sender)
		if val is None or val == u256(0):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} No credits available to claim")
		self.credits[sender] = u256(0)
		_Recipient(sender).emit_transfer(value=val)

	@gl.public.write
	def claim_pro_rata_refund(self, campaign_id: str) -> None:
		cid = str(campaign_id).strip()
		camp = self._get_campaign(cid)
		if camp.status != STATUS_CANCELLED:
			raise gl.vm.UserError(f"{ERROR_EXPECTED} Campaign is not cancelled; refunds unavailable")

		sender = gl.message.sender_address
		sender_obj = Address(sender) if not isinstance(sender, Address) else sender
		key = f"{cid}:{str(sender_obj)}"
		contribution = self.campaign_backers.get(key)
		if contribution is None or contribution == u256(0):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} No contribution found for sender")

		# Remaining unspent vault funds
		unspent = camp.total_funded - camp.total_released
		if unspent == u256(0) or camp.total_funded == u256(0):
			raise gl.vm.UserError(f"{ERROR_EXPECTED} No unspent funds remaining for refund")

		# Pro-rata refund calculation: (unspent * contribution) / total_funded
		refund_amount = (unspent * contribution) // camp.total_funded
		self.campaign_backers[key] = u256(0)

		if refund_amount > u256(0):
			_Recipient(sender).emit_transfer(value=refund_amount)


@gl.evm.contract_interface
class _Recipient:
	class View:
		pass

	class Write:
		pass

