// ✍️ Essays — write it, get it marked, fix it, get graded. See
// BUSINESS_REQUIREMENTS.md §19.
//
// The same app looks completely different from the two sides: the writer gets a
// keyboard and a deadline, the parent gets a red pen and the last word.
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import { WritePanel } from '../components/essay/WritePanel'
import { HistoryPanel } from '../components/essay/HistoryPanel'
import { TopicsPanel } from '../components/essay/TopicsPanel'
import { ReviewPanel } from '../components/essay/ReviewPanel'
import { WordsPanel } from '../components/essay/WordsPanel'
import { AskTopicPanel } from '../components/essay/AskTopicPanel'

export function EssayScreen({ tab }: { tab: string }) {
  const { activeProfileId } = useStore()
  const isParent = activeProfileId === PARENT_ID

  return (
    <div className="screen">
      {isParent ? (
        <>
          {tab === 'topics' && <TopicsPanel />}
          {tab === 'desk' && <ReviewPanel />}
          {tab === 'words' && <WordsPanel readOnly />}
          {tab === 'marked' && <HistoryPanel />}
        </>
      ) : (
        <>
          {tab === 'write' && <WritePanel />}
          {tab === 'ideas' && <AskTopicPanel />}
          {tab === 'words' && <WordsPanel />}
          {tab === 'marked' && <HistoryPanel authorId={activeProfileId ?? undefined} />}
        </>
      )}
    </div>
  )
}
