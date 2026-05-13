// DuelMe tests — happy path + critical access / state guards.
//
// Acton's test runner discovers `get fun \`test ...\`` functions, deploys a
// fresh contract per test, and lets us drive it via the auto-generated
// wrapper exposed in `@wrappers/Duelme.gen`.

import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"

import "@contracts/constants"
import "@contracts/errors"
import "@contracts/messages"
import "@contracts/storage"
import "@contracts/utils"
import "@wrappers/Duelme.gen"

fun setupTest(): (Duelme, Treasury, Treasury, Treasury) {
    val owner = testing.treasury("owner");
    val creator = testing.treasury("creator");
    val opponent = testing.treasury("opponent");

    val initial = Storage {
        owner: owner.address,
        paused: false,
        duelCount: 0,
        emergencyNonce: 0,
        duels: [],
        stats: [],
        emergencyRequests: [],
    };
    val contract = Duelme.fromStorage(initial);
    val res = contract.deploy(owner.address, { value: ton("1") });
    expect(res).toHaveSuccessfulDeploy({
        to: contract.address,
    });

    return (contract, owner, creator, opponent);
}

const SECRET: uint256 = 0xDEADBEEFCAFEBABE000000000000000000000000000000000000000000000001;

fun makeHash(): uint256 {
    return hashInviteSecret(SECRET);
}

fun emptyMessage(): cell {
    return beginCell().endCell();
}

// ─── happy path ────────────────────────────────────────────────────────────

get fun `test deploy exposes initial owner`() {
    val (contract, owner, _, _) = setupTest();
    expect(contract.owner()).toEqual(owner.address);
    expect(contract.duelCount()).toEqual(0);
    expect(contract.isPaused()).toEqual(false);
}

get fun `test create duel increments count`() {
    val (contract, _, creator, _) = setupTest();
    val res = contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("5") + STORAGE_RESERVE + FORWARD_FEE },
    );
    expect(res).toHaveSuccessfulTx<CreateDuelMsg>({
        from: creator.address,
        to: contract.address,
    });
    expect(contract.duelCount()).toEqual(1);
}

get fun `test join duel transitions to Funded`() {
    val (contract, _, creator, opponent) = setupTest();
    val wager = ton("3");
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: wager + STORAGE_RESERVE + FORWARD_FEE },
    );
    val res = contract.sendJoinDuelMsg(
        opponent.address,
        2,
        0,
        SECRET,
        { value: wager + FORWARD_FEE * 2 },
    );
    expect(res).toHaveSuccessfulTx<JoinDuelMsg>({
        from: opponent.address,
        to: contract.address,
    });
    val duel = contract.getDuel(0);
    expect(duel.state).toEqual(DuelState.Funded as uint8);
}

// ─── reverts ──────────────────────────────────────────────────────────────

get fun `test create duel below min wager reverts`() {
    val (contract, _, creator, _) = setupTest();
    val res = contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("0.5") + STORAGE_RESERVE },
    );
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.ValueBelowRequired,
    });
}

get fun `test create duel zero invite hash reverts`() {
    val (contract, _, creator, _) = setupTest();
    val res = contract.sendCreateDuelMsg(
        creator.address,
        1,
        0,
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.InvalidInviteHash,
    });
}

get fun `test creator cannot join own duel`() {
    val (contract, _, creator, _) = setupTest();
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    val res = contract.sendJoinDuelMsg(
        creator.address,
        2,
        0,
        SECRET,
        { value: ton("3") + FORWARD_FEE * 2 },
    );
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.CannotJoinOwnDuel,
    });
}

get fun `test join with wrong invite secret reverts`() {
    val (contract, _, creator, opponent) = setupTest();
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    val res = contract.sendJoinDuelMsg(
        opponent.address,
        2,
        0,
        0xBAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0BAD0,
        { value: ton("3") + FORWARD_FEE * 2 },
    );
    expect(res).toHaveFailedTx({
        from: opponent.address,
        to: contract.address,
        exitCode: Errors.InvalidInviteSecret,
    });
}

get fun `test only creator can cancel`() {
    val (contract, _, creator, opponent) = setupTest();
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    val res = contract.sendCancelDuelMsg(opponent.address, 2, 0, { value: FORWARD_FEE * 4 });
    expect(res).toHaveFailedTx({
        from: opponent.address,
        to: contract.address,
        exitCode: Errors.OnlyCreator,
    });
}

// ─── confirm / dispute / refund ────────────────────────────────────────────

get fun `test confirm result resolves the duel`() {
    val (contract, _, creator, opponent) = setupTest();
    val wager = ton("3");
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: wager + STORAGE_RESERVE + FORWARD_FEE },
    );
    contract.sendJoinDuelMsg(
        opponent.address,
        2,
        0,
        SECRET,
        { value: wager + FORWARD_FEE * 2 },
    );
    contract.sendClaimVictoryMsg(opponent.address, 3, 0, { value: FORWARD_FEE * 4 });
    val res = contract.sendConfirmResultMsg(creator.address, 4, 0, { value: FORWARD_FEE * 4 });
    expect(res).toHaveSuccessfulTx<ConfirmResultMsg>({
        from: creator.address,
        to: contract.address,
    });
    val duel = contract.getDuel(0);
    expect(duel.state).toEqual(DuelState.Resolved as uint8);
}

get fun `test claimer cannot confirm own claim`() {
    val (contract, _, creator, opponent) = setupTest();
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    contract.sendJoinDuelMsg(
        opponent.address,
        2,
        0,
        SECRET,
        { value: ton("3") + FORWARD_FEE * 2 },
    );
    contract.sendClaimVictoryMsg(creator.address, 3, 0, { value: FORWARD_FEE * 4 });
    val res = contract.sendConfirmResultMsg(creator.address, 4, 0, { value: FORWARD_FEE * 4 });
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.CannotConfirmOwnClaim,
    });
}

get fun `test refund fails before claim timeout`() {
    val (contract, _, creator, opponent) = setupTest();
    contract.sendCreateDuelMsg(
        creator.address,
        1,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    contract.sendJoinDuelMsg(
        opponent.address,
        2,
        0,
        SECRET,
        { value: ton("3") + FORWARD_FEE * 2 },
    );
    contract.sendClaimVictoryMsg(creator.address, 3, 0, { value: FORWARD_FEE * 4 });
    val res = contract.sendRefundMsg(opponent.address, 4, 0, { value: FORWARD_FEE * 4 });
    expect(res).toHaveFailedTx({
        from: opponent.address,
        to: contract.address,
        exitCode: Errors.ClaimTimeoutNotReached,
    });
}

// ─── admin -------------------------------------------------------------------

get fun `test only owner can pause`() {
    val (contract, _, creator, _) = setupTest();
    val res = contract.sendPauseMsg(creator.address, 1, { value: ton("0.05") });
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.OnlyOwner,
    });
}

get fun `test owner can pause and unpause`() {
    val (contract, owner, _, _) = setupTest();
    val pauseRes = contract.sendPauseMsg(owner.address, 1, { value: ton("0.05") });
    expect(pauseRes).toHaveSuccessfulTx<PauseMsg>({ from: owner.address, to: contract.address });
    expect(contract.isPaused()).toEqual(true);

    val unpauseRes = contract.sendUnpauseMsg(owner.address, 2, { value: ton("0.05") });
    expect(unpauseRes).toHaveSuccessfulTx<UnpauseMsg>({ from: owner.address, to: contract.address });
    expect(contract.isPaused()).toEqual(false);
}

get fun `test pause blocks create`() {
    val (contract, owner, creator, _) = setupTest();
    contract.sendPauseMsg(owner.address, 1, { value: ton("0.05") });
    val res = contract.sendCreateDuelMsg(
        creator.address,
        2,
        makeHash(),
        emptyMessage(),
        { value: ton("3") + STORAGE_RESERVE + FORWARD_FEE },
    );
    expect(res).toHaveFailedTx({
        from: creator.address,
        to: contract.address,
        exitCode: Errors.Paused,
    });
}
