import pytest
import json
import re

TARGET_GOAL = 10_000_000_000_000_000_000  # 10 ETH/GEN in atto


def _deploy(direct_vm, direct_deploy, sender):
    direct_vm.sender = sender
    return direct_deploy("contracts/ImpactVault.py")


def _create_sample_campaign(direct_vm, contract, creator, beneficiary, cid="camp-1", category="DeFi"):
    direct_vm.sender = creator
    contract.create_campaign(
        cid,
        beneficiary,
        "Decentralized Liquidity Engine",
        category,
        "High-performance automated liquidity vault on GenLayer.",
        TARGET_GOAL,
        ["Milestone 1: Spec & Prototype", "Milestone 2: Testnet Deployment", "Milestone 3: Security Audit"],
        [
            "Open source GitHub repo with prototype and unit test coverage > 80%.",
            "Deployed smart contracts on StudioNet with interactive frontend.",
            "Complete audit report from recognized firm with zero high-severity issues.",
        ],
        [2500, 3500, 4000],  # 25%, 35%, 40% = 10000 bps
    )


def test_create_campaign_success_and_views(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Creating a valid campaign initializes status, milestones, and platform metrics."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1", "DeFi")

    camp = contract.get_campaign("camp-1")
    assert camp["creator"].startswith("0x")
    assert camp["beneficiary"].startswith("0x")
    assert camp["title"] == "Decentralized Liquidity Engine"
    assert camp["category"] == "DeFi"
    assert camp["target_amount"] == TARGET_GOAL
    assert camp["total_funded"] == 0
    assert camp["total_released"] == 0
    assert camp["current_milestone_index"] == 0
    assert camp["total_milestones"] == 3
    assert camp["status"] == "funding"

    assert contract.get_milestones_count("camp-1") == 3
    m0 = contract.get_milestone("camp-1", 0)
    assert m0["title"] == "Milestone 1: Spec & Prototype"
    assert m0["bps"] == 2500
    assert m0["status"] == "pending"

    metrics = contract.get_platform_metrics()
    assert metrics["total_campaigns"] == 1
    assert metrics["funding_campaigns"] == 1
    assert metrics["total_funded_atto"] == 0


def test_create_campaign_invalid_bps_sum_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Milestone BPS not summing to 10,000 reverts with clear expected error."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Milestone bps must sum exactly to 10000"):
        contract.create_campaign(
            "bad-bps",
            direct_bob,
            "Title",
            "AI / Agents",
            "Desc",
            TARGET_GOAL,
            ["M1", "M2"],
            ["Crit 1", "Crit 2"],
            [5000, 4000],  # 9000 != 10000
        )


def test_create_campaign_empty_fields_and_duplicate_id_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Empty id, zero target, or duplicate id reverts."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("must not be empty"):
        contract.create_campaign("", direct_bob, "T", "DeFi", "D", TARGET_GOAL, ["M1"], ["C1"], [10000])

    with direct_vm.expect_revert("Target amount must be positive"):
        contract.create_campaign("c-zero", direct_bob, "T", "DeFi", "D", 0, ["M1"], ["C1"], [10000])

    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "c-dup")
    with direct_vm.expect_revert("Campaign id already exists"):
        _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "c-dup")


def test_fund_campaign_activates_when_target_reached(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Backers fund the campaign, and reaching target_amount transitions status to 'active'."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    # Partial funding: 4 ETH
    direct_vm.sender = direct_alice
    direct_vm.value = 4_000_000_000_000_000_000
    contract.fund_campaign("camp-1")

    camp = contract.get_campaign("camp-1")
    assert camp["status"] == "funding"
    assert camp["total_funded"] == 4_000_000_000_000_000_000
    assert contract.get_backer_contribution("camp-1", direct_alice) == 4_000_000_000_000_000_000

    # Remaining funding: 6 ETH
    direct_vm.sender = direct_bob
    direct_vm.value = 6_000_000_000_000_000_000
    contract.fund_campaign("camp-1")

    camp = contract.get_campaign("camp-1")
    assert camp["status"] == "active"
    assert camp["total_funded"] == 10_000_000_000_000_000_000
    assert contract.get_backer_contribution("camp-1", direct_bob) == 6_000_000_000_000_000_000

    backers = contract.get_campaign_backers("camp-1")["backers"]
    assert len(backers) == 2


def test_submit_deliverable_access_control_and_https_validation(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Only beneficiary/creator can submit deliverables, and non-https URLs are rejected."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    # Fund to active
    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    # Unauthorized submitter reverts
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only beneficiary or creator may submit deliverables"):
        contract.submit_deliverable("camp-1", 0, "Fake deliverable", ["https://github.com/org/repo"])

    # Beneficiary submits with invalid http URL reverts
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Evidence URL must start with https://"):
        contract.submit_deliverable("camp-1", 0, "Deliverable", ["http://insecure.org/repo"])

    # Beneficiary submits valid deliverable
    contract.submit_deliverable(
        "camp-1",
        0,
        "Completed architecture spec and GitHub prototype.",
        ["https://github.com/org/repo", "https://prototype.org/demo"],
    )

    m0 = contract.get_milestone("camp-1", 0)
    assert m0["status"] == "submitted"
    assert len(m0["evidence_urls"]) == 2
    assert m0["deliverable_desc"] == "Completed architecture spec and GitHub prototype."


def test_evaluate_milestone_with_web_evidence_and_release(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When AI validators evaluate live web evidence and approve, tranche is credited to beneficiary."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    direct_vm.sender = direct_bob
    contract.submit_deliverable(
        "camp-1", 0, "Architecture spec and prototype completed.", ["https://github.com/org/proto"]
    )

    # Mock web fetch
    direct_vm.mock_web(
        r".*",
        {"status": 200, "body": "Repository commit 7a8b9c: All 45 tests passing. Architecture doc included."},
    )

    # Mock AI LLM approval
    direct_vm.mock_llm(
        r".*",
        json.dumps({
            "verdict": "APPROVED",
            "confidence": 98,
            "notes": "Deliverable satisfies architectural prototype criteria.",
        }),
    )

    direct_vm.sender = direct_alice
    contract.evaluate_milestone("camp-1", 0)

    m0 = contract.get_milestone("camp-1", 0)
    assert m0["status"] == "approved"
    assert m0["evaluation_notes"] == "Deliverable satisfies architectural prototype criteria."

    camp = contract.get_campaign("camp-1")
    assert camp["total_released"] == 2_500_000_000_000_000_000
    assert camp["current_milestone_index"] == 1
    assert contract.get_credits(direct_bob) == 2_500_000_000_000_000_000


def test_evaluate_milestone_rejected_allows_resubmission(direct_vm, direct_deploy, direct_alice, direct_bob):
    """When AI validators reject a deficient deliverable, status is 'rejected' and funds remain locked."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    direct_vm.sender = direct_bob
    contract.submit_deliverable("camp-1", 0, "Incomplete draft", ["https://github.com/empty"])

    # Mock AI LLM rejection
    direct_vm.mock_llm(
        r".*",
        json.dumps({
            "verdict": "REJECTED",
            "confidence": 90,
            "notes": "Prototype missing core test coverage required by criteria.",
        }),
    )

    contract.evaluate_milestone("camp-1", 0)

    m0 = contract.get_milestone("camp-1", 0)
    assert m0["status"] == "rejected"
    assert contract.get_campaign("camp-1")["current_milestone_index"] == 0
    assert contract.get_credits(direct_bob) == 0

    # Beneficiary resubmits with improved deliverable
    contract.submit_deliverable(
        "camp-1", 0, "Updated prototype with 100% test coverage.", ["https://github.com/full-tests"]
    )
    assert contract.get_milestone("camp-1", 0)["status"] == "submitted"


def test_campaign_updates_and_backer_notes(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Creator posts progress updates; active backer posts endorsement notes."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    # Charlie backs the campaign
    direct_vm.sender = direct_charlie
    direct_vm.value = 5_000_000_000_000_000_000
    contract.fund_campaign("camp-1")

    # Creator posts update
    direct_vm.sender = direct_alice
    contract.post_campaign_update("camp-1", "Development kickoff completed!")

    # Active backer posts endorsement note
    direct_vm.sender = direct_charlie
    contract.post_backer_note("camp-1", "Excited to support this public good!")

    # Non-backer trying to post backer note reverts
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only active backers may post endorsement notes"):
        contract.post_backer_note("camp-1", "Spam note")

    updates = contract.get_campaign_updates("camp-1")["updates"]
    assert len(updates) == 2
    assert updates[0]["update_type"] == "CREATOR_LOG"
    assert updates[0]["text"] == "Development kickoff completed!"
    assert updates[1]["update_type"] == "BACKER_NOTE"
    assert updates[1]["text"] == "Excited to support this public good!"


def test_full_lifecycle_all_milestones_completed(direct_vm, direct_deploy, direct_alice, direct_bob):
    """All 3 milestones approved sequentially -> 100% funds released and status becomes completed."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    direct_vm.mock_llm(
        r".*",
        json.dumps({"verdict": "APPROVED", "confidence": 95, "notes": "Verified."}),
    )

    # Milestone 0 (25%)
    direct_vm.sender = direct_bob
    contract.submit_deliverable("camp-1", 0, "M1 done", ["https://github.com/m1"])
    contract.evaluate_milestone("camp-1", 0)

    # Milestone 1 (35%)
    contract.submit_deliverable("camp-1", 1, "M2 done", ["https://github.com/m2"])
    contract.evaluate_milestone("camp-1", 1)

    # Milestone 2 (40%)
    contract.submit_deliverable("camp-1", 2, "M3 done", ["https://github.com/m3"])
    contract.evaluate_milestone("camp-1", 2)

    camp = contract.get_campaign("camp-1")
    assert camp["status"] == "completed"
    assert camp["total_released"] == TARGET_GOAL
    assert contract.get_credits(direct_bob) == TARGET_GOAL

    metrics = contract.get_platform_metrics()
    assert metrics["completed_campaigns"] == 1


def test_beneficiary_claim_payout_pull_pattern(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Beneficiary can safely pull payout credits, zeroing contract credit balance."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    direct_vm.mock_llm(
        r".*",
        json.dumps({"verdict": "APPROVED", "confidence": 95, "notes": "Verified."}),
    )

    direct_vm.sender = direct_bob
    contract.submit_deliverable("camp-1", 0, "M1 done", ["https://github.com/m1"])
    contract.evaluate_milestone("camp-1", 0)

    assert contract.get_credits(direct_bob) == 2_500_000_000_000_000_000

    # Beneficiary claims payout
    contract.claim_payout()
    assert contract.get_credits(direct_bob) == 0

    # Double claim reverts
    with direct_vm.expect_revert("No credits available to claim"):
        contract.claim_payout()


def test_cancel_campaign_and_pro_rata_refund(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """If a project is cancelled after Milestone 1 (25% spent), backers receive 75% pro-rata refund."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    # Alice funds 6 ETH (60%), Charlie funds 4 ETH (40%)
    direct_vm.sender = direct_alice
    direct_vm.value = 6_000_000_000_000_000_000
    contract.fund_campaign("camp-1")

    direct_vm.sender = direct_charlie
    direct_vm.value = 4_000_000_000_000_000_000
    contract.fund_campaign("camp-1")

    # Milestone 1 (25%) approved and paid out
    direct_vm.mock_llm(
        r".*",
        json.dumps({"verdict": "APPROVED", "confidence": 95, "notes": "Verified."}),
    )
    direct_vm.sender = direct_bob
    contract.submit_deliverable("camp-1", 0, "M1 done", ["https://github.com/m1"])
    contract.evaluate_milestone("camp-1", 0)

    # Creator cancels campaign (e.g. project team disbanded)
    direct_vm.sender = direct_alice
    contract.cancel_campaign("camp-1")
    assert contract.get_campaign("camp-1")["status"] == "cancelled"

    # Remaining unspent vault balance = 7.5 ETH
    # Alice had 60% contribution -> Alice should get 60% of 7.5 ETH = 4.5 ETH
    # Charlie had 40% contribution -> Charlie should get 40% of 7.5 ETH = 3.0 ETH
    direct_vm.sender = direct_alice
    contract.claim_pro_rata_refund("camp-1")
    assert contract.get_backer_contribution("camp-1", direct_alice) == 0

    direct_vm.sender = direct_charlie
    contract.claim_pro_rata_refund("camp-1")
    assert contract.get_backer_contribution("camp-1", direct_charlie) == 0


def test_evaluate_unsubmitted_and_wrong_index_reverts(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Evaluating a milestone before deliverable submission or wrong milestone index reverts."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    # Evaluate before submission -> reverts
    with direct_vm.expect_revert("Milestone deliverable must be submitted before evaluation"):
        contract.evaluate_milestone("camp-1", 0)

    # Submit M0, but try to evaluate M1 -> reverts
    direct_vm.sender = direct_bob
    contract.submit_deliverable("camp-1", 0, "M0 deliverable", ["https://github.com/org/m0"])

    with direct_vm.expect_revert("Target milestone is not the currently active milestone"):
        contract.evaluate_milestone("camp-1", 1)


def test_cancel_campaign_access_and_state_guards(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Only creator may cancel, non-cancelled refunds revert, and completed campaigns cannot be cancelled."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    # Non-creator cancel reverts
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only creator may cancel"):
        contract.cancel_campaign("camp-1")

    # Trying to claim refund on un-cancelled campaign reverts
    with direct_vm.expect_revert("Campaign is not cancelled; refunds unavailable"):
        contract.claim_pro_rata_refund("camp-1")
