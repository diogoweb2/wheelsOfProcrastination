// The marked-up essay: his own words with the problems circled on top of them.
//
// A circle round the word is the whole trick — it's how a teacher hands back a
// page, it says "look here" without saying what to write, and it survives him
// editing the sentence because the notes point at quotes, not offsets.
import type { Essay, EssayComment } from '../../types'
import { ISSUE_EMOJI, issueTint, markUp } from '../../logic/essay'

export function MarkedEssay({
  essay,
  comments,
  selectedId,
  flashId,
  onSelect,
}: {
  essay: Pick<Essay, 'title' | 'paragraphs'>
  comments: EssayComment[]
  selectedId?: string | null
  /** Briefly lit up because someone jumped here from its note. */
  flashId?: string | null
  onSelect?: (commentId: string) => void
}) {
  return (
    <div className="essay-read">
      <Line
        text={essay.title || '(no title)'}
        comments={comments.filter((c) => c.para === -1)}
        className="essay-read-title"
        selectedId={selectedId}
        flashId={flashId}
        onSelect={onSelect}
      />
      {essay.paragraphs.map((p, i) => (
        <Line
          key={i}
          text={p}
          comments={comments.filter((c) => c.para === i)}
          className="essay-read-para"
          selectedId={selectedId}
          flashId={flashId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function Line({
  text,
  comments,
  className,
  selectedId,
  flashId,
  onSelect,
}: {
  text: string
  comments: EssayComment[]
  className: string
  selectedId?: string | null
  flashId?: string | null
  onSelect?: (commentId: string) => void
}) {
  const chunks = markUp(text, comments)
  return (
    <p className={className}>
      {chunks.map((chunk, i) =>
        chunk.comment ? (
          // One word gets the teacher's circle. A whole phrase does NOT — ringing
          // half a sentence reads as "all of this is wrong", which is both untrue
          // and crushing. A phrase gets a quiet tinted underline instead.
          <mark
            key={i}
            className={`essay-mark${/\s/.test(chunk.text.trim()) ? ' essay-mark--span' : ''}${
              selectedId === chunk.comment.id ? ' is-picked' : ''
            }${chunk.comment.status === 'fixed' ? ' is-done' : ''}${flashId === chunk.comment.id ? ' is-flash' : ''}`}
            data-note={chunk.comment.id}
            style={{ '--mark': issueTint(chunk.comment.issue) } as React.CSSProperties}
            onClick={() => onSelect?.(chunk.comment!.id)}
            title={chunk.comment.text}
          >
            {chunk.text}
            {!/\s/.test(chunk.text.trim()) && <sup>{ISSUE_EMOJI[chunk.comment.issue]}</sup>}
          </mark>
        ) : (
          <span key={i}>{chunk.text}</span>
        ),
      )}
    </p>
  )
}
