import "@contracts/errors"
import "@contracts/constants"

// Compute SHA-256 of a 256-bit invite secret. The frontend mirrors this so
// that the on-chain `inviteHash` is `sha256(secret)` and joining a duel
// requires the original secret distributed off-chain via the share link.
fun hashInviteSecret(secret: uint256): uint256 {
    val s = beginCell().storeUint(secret, 256).endCell().beginParse();
    return s.bitsHash();
}

// Walk the UTF-8 byte stream of a duel message and verify byte / code-point
// limits and well-formed continuation bytes. Snake-cell layout — when we run
// out of bits in the current slice, hop into the next ref cell seamlessly.
fun validateMessage(messageCell: cell): void {
    var s = messageCell.beginParse();
    var byteCount: int = 0;
    var codePoints: int = 0;
    var finished: bool = false;

    while (!finished) {
        if (s.remainingBitsCount() < 8) {
            if (s.remainingRefsCount() == 0) {
                finished = true;
            } else {
                s = s.loadRef().beginParse();
            }
        } else {
            val leading: int = s.loadUint(8);
            byteCount += 1;
            assert (byteCount <= MAX_MESSAGE_BYTES) throw Errors.MessageTooLong;

            var sequenceLength: int;
            if (leading < 0x80) {
                sequenceLength = 1;
            } else if (leading < 0xC2) {
                throw Errors.InvalidUtf8;
            } else if (leading < 0xE0) {
                sequenceLength = 2;
            } else if (leading < 0xF0) {
                sequenceLength = 3;
            } else if (leading < 0xF5) {
                sequenceLength = 4;
            } else {
                throw Errors.InvalidUtf8;
            }

            var i: int = 1;
            var b1: int = 0;
            while (i < sequenceLength) {
                if (s.remainingBitsCount() < 8) {
                    assert (s.remainingRefsCount() > 0) throw Errors.InvalidUtf8;
                    s = s.loadRef().beginParse();
                }
                val b: int = s.loadUint(8);
                byteCount += 1;
                assert (byteCount <= MAX_MESSAGE_BYTES) throw Errors.MessageTooLong;
                assert ((b & 0xC0) == 0x80) throw Errors.InvalidUtf8;
                if (i == 1) {
                    b1 = b;
                }
                i += 1;
            }

            if (sequenceLength == 3) {
                if (leading == 0xE0) {
                    assert (b1 >= 0xA0) throw Errors.InvalidUtf8;
                } else if (leading == 0xED) {
                    assert (b1 < 0xA0) throw Errors.InvalidUtf8;
                }
            } else if (sequenceLength == 4) {
                if (leading == 0xF0) {
                    assert (b1 >= 0x90) throw Errors.InvalidUtf8;
                } else if (leading == 0xF4) {
                    assert (b1 < 0x90) throw Errors.InvalidUtf8;
                }
            }

            codePoints += 1;
            assert (codePoints <= MAX_MESSAGE_CODEPOINTS) throw Errors.MessageTooLong;
        }
    }
}
