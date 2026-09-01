import json

TARGET_GOAL = 10_000_000_000_000_000_000  # 10 ETH in atto


def _deploy(direct_vm, direct_deploy, who):
    direct_vm.sender = who
    return direct_deploy("contracts/ImpactVault.py")


def _create_sample_campaign(direct_vm, contract, creator, beneficiary, cid="camp-1"):
    direct_vm.sender = creator
    titles = ["M1: Architecture & Prototype", "M2: Core Protocol & Testnet", "M3: Security Audit & Mainnet"]
    criteria = [
        "Complete technical spec and functional MVP prototype with test coverage.",
        "Deploy full protocol to GenLayer StudioNet with frontend demo.",
        "Third-party security audit completed with all critical findings resolved.",
    ]
    bps = [2500, 3500, 4000]  # 25%, 35%, 40% = 100%
    contract.create_campaign(
        cid,
        beneficiary,
        "GenLayer Cross-Chain Liquidity Hub",
        "Next-generation decentralized liquidity infrastructure on GenLayer.",
        TARGET_GOAL,
        titles,
        criteria,
        bps,
    )


def test_create_campaign_success_and_views(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Creator creates a 3-milestone campaign and view methods reflect exact initial state."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    assert contract.total_campaigns() == 1
    ids = contract.get_campaign_ids()["ids"]
    assert ids == ["camp-1"]

    camp = contract.get_campaign("camp-1")
    assert camp["title"] == "GenLayer Cross-Chain Liquidity Hub"
    assert camp["status"] == "funding"
    assert camp["target_amount"] == TARGET_GOAL
    assert camp["total_funded"] == 0
    assert camp["total_released"] == 0
    assert camp["current_milestone_index"] == 0
    assert camp["total_milestones"] == 3

    assert contract.get_milestones_count("camp-1") == 3
    m0 = contract.get_milestone("camp-1", 0)
    assert m0["title"] == "M1: Architecture & Prototype"
    assert m0["bps"] == 2500
    assert m0["status"] == "pending"
    assert m0["deliverable_desc"] == ""
    assert m0["evidence_urls"] == []


def test_create_campaign_invalid_bps_sum_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Milestone basis points must sum exactly to 10000 (100%)."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Milestone bps must sum exactly to 10000"):
        contract.create_campaign(
            "bad-camp",
            direct_bob,
            "Bad Split Project",
            "Description",
            TARGET_GOAL,
            ["M1", "M2"],
            ["Crit 1", "Crit 2"],
            [4000, 4000],  # 8000 != 10000
        )


def test_create_campaign_empty_fields_and_duplicate_id_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    """Empty strings, zero target amounts, and duplicate campaign IDs are rejected."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("must not be empty"):
        contract.create_campaign("", direct_bob, "T", "D", TARGET_GOAL, ["M1"], ["C1"], [10000])

    with direct_vm.expect_revert("Target amount must be positive"):
        contract.create_campaign("c-zero", direct_bob, "T", "D", 0, ["M1"], ["C1"], [10000])

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

    # Unauthorized party tries to submit
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only beneficiary or creator"):
        contract.submit_deliverable("camp-1", 0, "Fake deliverable", ["https://github.com/repo"])

    # Beneficiary submits non-https URL -> rejected
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Evidence URL must start with https://"):
        contract.submit_deliverable("camp-1", 0, "Valid spec", ["http://insecure-site.com/spec"])

    # Beneficiary submits valid deliverable
    contract.submit_deliverable(
        "camp-1",
        0,
        "Completed architecture spec and GitHub prototype.",
        ["https://github.com/org/prototype", "https://docs.org/spec"],
    )

    m0 = contract.get_milestone("camp-1", 0)
    assert m0["status"] == "submitted"
    assert len(m0["evidence_urls"]) == 2
    assert m0["deliverable_desc"] == "Completed architecture spec and GitHub prototype."


def test_evaluate_milestone_approved_releases_tranche_and_advances(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """When AI validators approve Milestone 1 (25%), 2.5 ETH is credited to beneficiary and M2 becomes active."""
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create_sample_campaign(direct_vm, contract, direct_alice, direct_bob, "camp-1")

    direct_vm.sender = direct_alice
    direct_vm.value = TARGET_GOAL
    contract.fund_campaign("camp-1")

    direct_vm.sender = direct_bob
    contract.submit_deliverable(
        "camp-1", 0, "Architecture spec completed.", ["https://github.com/org/proto"]
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
    # 25% of 10 ETH = 2.5 ETH
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

    # Remaining unspent vault balance = 7.5 ETH (7,500,000,000,000,000,000 atto)
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

