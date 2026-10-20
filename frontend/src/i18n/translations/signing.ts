import { defineSection } from './defineSection';

/** What a signature needs from the wallet: the stake it takes, against what the wallet holds. */
export const signingTranslations = defineSection({
  en: {
    'sign.need.usdt': '{wager} USDT from your wallet',
    'sign.need.usdt.have': 'It holds {have} USDT',
    'sign.need.enough': 'Enough',
  },
  ru: {
    'sign.need.usdt': '{wager} USDT из кошелька',
    'sign.need.usdt.have': 'В нём {have} USDT',
    'sign.need.enough': 'Хватает',
  },
});
