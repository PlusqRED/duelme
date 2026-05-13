import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/constants", () => ({
  config: {
    botUsername: "duelme_test_bot",
    appShortName: "play",
    network: "testnet",
    duelMeAddress: "EQAA",
    toncenterUrl: "",
    toncenterApiKey: "",
    tonconnectManifestUrl: "",
  },
  MAX_MESSAGE_BYTES: 128,
  MAX_MESSAGE_CODEPOINTS: 32,
  DEFAULT_WAGER_TON: "5",
  MIN_WAGER_TON_DISPLAY: "1",
  CLAIM_TIMEOUT_SEC: 3600,
}));

import { buildShareLinks } from "@/lib/share";

describe("buildShareLinks", () => {
  it("constructs a Telegram deep link with startapp", () => {
    const links = buildShareLinks({
      duelId: 7n,
      inviteSecret: 0xdeadbeefn,
      appOrigin: "https://example.com",
      caption: "challenge accepted",
    });
    expect(links.telegram).toMatch(/^https:\/\/t\.me\/duelme_test_bot\/play\?startapp=/);
    expect(links.fragment).toMatch(/^https:\/\/example\.com\/duel\/7#invite=/);
    expect(links.shareTelegram).toContain("t.me/share/url");
    expect(links.shareTelegram).toContain(encodeURIComponent(links.telegram));
  });

  it("token is url-safe base64 (no padding, no + or /)", () => {
    const links = buildShareLinks({ duelId: 1n, inviteSecret: 2n, caption: "c" });
    const startEnc = links.telegram.split("startapp=")[1]!;
    const start = decodeURIComponent(startEnc);
    expect(start).not.toContain("=");
    expect(start).not.toContain("+");
    expect(start).not.toContain("/");
  });

  it("fragment contains the same token as the telegram link", () => {
    const links = buildShareLinks({ duelId: 11n, inviteSecret: 22n, caption: "c" });
    const start = decodeURIComponent(links.telegram.split("startapp=")[1]!);
    expect(links.fragment.endsWith(`#invite=${start}`)).toBe(true);
  });
});
