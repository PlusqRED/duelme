// Build Telegram share links for a duel.
//
// The Mini App lives at `t.me/<bot>/<short>` and accepts a `startapp`
// parameter that gets routed back through `initData.start_param`. We encode
// the (duelId, inviteSecret) pair into a URL-safe token and embed it there.
//
// For sharing outside Telegram, we expose a fallback HTTPS URL with the
// secret in the URL fragment so it never reaches a server.

import { config } from "./constants";
import { encodeInviteToken } from "./invite";

export interface ShareLinks {
  telegram: string;          // t.me deep link with startapp param
  fragment: string;          // https://... URL with #invite=
  shareTelegram: string;     // t.me/share/url with the deep link prefilled
}

export interface ShareLinksArgs {
  duelId: bigint;
  inviteSecret: bigint;
  /** Falls back to `window.location.origin` when available. */
  appOrigin?: string;
  /** Localised invitation caption. Pass via the current i18n bundle. */
  caption: string;
}

export function buildShareLinks(args: ShareLinksArgs): ShareLinks {
  const token = encodeInviteToken({ duelId: args.duelId, secret: args.inviteSecret });
  const startapp = encodeURIComponent(token);

  const telegram = `https://t.me/${config.botUsername}/${config.appShortName}?startapp=${startapp}`;
  const appOrigin =
    args.appOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const fragment = `${appOrigin}/duel/${args.duelId}#invite=${token}`;
  const shareTelegram = `https://t.me/share/url?url=${encodeURIComponent(telegram)}&text=${encodeURIComponent(args.caption)}`;
  return { telegram, fragment, shareTelegram };
}
