import { getTranslation } from '@/i18n/serverTranslation';
import type { GameCategory } from '@/lib/game';
import type { GameGuideSection } from '@/lib/gameGuides';
import { gameInk } from '@/lib/gameTile';

const TITLE_ID = 'game-guide-title';

interface GameGuideBodyProps {
  gameName: string;
  category: GameCategory;
  sections: readonly GameGuideSection[];
}

/**
 * A game's guide under its duels: how a duel in it is played, set up and settled, each part a card
 * numbered on a keycap of the game's ink, the way its tile heads the page. Drawn on the server, so
 * the words are in the page a search engine reads.
 */
export async function GameGuideBody({ gameName, category, sections }: GameGuideBodyProps) {
  const { t } = await getTranslation();

  return (
    <section aria-labelledby={TITLE_ID} style={{ '--tone': gameInk(category) }} className="mt-section">
      <h2 id={TITLE_ID} className="mb-[clamp(24px,3vw,40px)] max-w-[780px] text-h2">
        {t('game.guideTitle', { game: gameName })}
      </h2>
      <ol className="grid gap-3.5 wide:grid-cols-3">
        {sections.map((section, index) => (
          <li
            key={section.heading}
            className="grid content-start gap-3 rounded-tile border border-line bg-paper p-[clamp(18px,2.4vw,26px)]"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl bg-(--tone) font-label text-paper shadow-[0_3px_0_var(--color-ink)] -rotate-3"
            >
              {index + 1}
            </span>
            <h3 className="text-lead">{section.heading}</h3>
            <p className="text-body text-pretty text-ink-2">{section.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
