'use client';

import { useId, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  FLASH_MS,
  applyGrade,
  createBoard,
  everySlotFilled,
  handleDragDropKey,
  placeChip,
  prefersReducedMotion,
  resetBoard,
  returnToPool,
  settleGrade,
  slotClassName,
  submissionOf,
  type ClientDragDropChip,
  type ClientDragDropSlot,
  type DragDropBoard,
  type DragDropGradeAction,
} from './dragdrop-model';

export type DragDropLabels = {
  eyebrow: string;
  submit: string;
  reset: string;
  correct: string;
  incorrect: string;
  explanation: string;
  error: string;
  pool: string;
  slotEmpty: string;
  slotFilled: string;
};

export type DragDropProps = {
  articleUid: string;
  sidecarId: string;
  title: string;
  prompt?: string;
  explanation?: string;
  fallbackLine: string;
  slots: ClientDragDropSlot[];
  chips: ClientDragDropChip[];
  labels: DragDropLabels;
  gradeAction: DragDropGradeAction;
};

export {
  FLASH_MS,
  applyGrade,
  createBoard,
  everySlotFilled,
  fallbackAnswerLine,
  gradeSubmission,
  handleDragDropKey,
  placeChip,
  resetBoard,
  returnToPool,
  settleGrade,
  slotClassName,
  submissionOf,
  toClientChips,
  toClientSlots,
} from './dragdrop-model';

function chipText(chips: readonly ClientDragDropChip[], chipId: string | null): string {
  if (!chipId) return '';
  return chips.find((chip) => chip.id === chipId)?.text ?? chipId;
}

function slotLabel(slot: ClientDragDropSlot, index: number, emptyLabel: string): string {
  return slot.label ?? `${emptyLabel} ${index + 1}`;
}

export type DragDropViewProps = {
  uid: string;
  articleUid: string;
  sidecarId: string;
  title: string;
  prompt?: string;
  explanation?: string;
  fallbackLine: string;
  slots: ClientDragDropSlot[];
  chips: ClientDragDropChip[];
  labels: DragDropLabels;
  board: DragDropBoard;
  pending: boolean;
  failed: boolean;
  onDragStart: (event: DragEvent<HTMLButtonElement>, chipId: string) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDropSlot: (event: DragEvent<HTMLButtonElement>, slotId: string) => void;
  onDropPool: (event: DragEvent<HTMLDivElement>) => void;
  onPoolKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onSlotActivate: (index: number, slotId: string) => void;
  onChipActivate: (chipId: string, index: number) => void;
  onSubmit: () => void;
  onReset: () => void;
};

/**
 * Pure view of the widget. Tests call this as a function so the tree
 * exists without `react-dom`. `DragDrop` is the hooks wrapper.
 */
export function DragDropView({
  uid,
  articleUid,
  sidecarId,
  title,
  prompt,
  explanation,
  fallbackLine,
  slots,
  chips,
  labels,
  board,
  pending,
  failed,
  onDragStart,
  onDragOver,
  onDropSlot,
  onDropPool,
  onPoolKeyDown,
  onSlotActivate,
  onChipActivate,
  onSubmit,
  onReset,
}: DragDropViewProps) {
  const slotIds = slots.map((slot) => slot.id);
  const filled = everySlotFilled(board.placement, slotIds);
  const poolId = `${uid}-pool`;
  const liveId = `${uid}-live`;
  const statusId = `${uid}-status`;
  const liveMessage =
    board.verdict === 'correct' ? labels.correct : board.verdict === 'incorrect' ? labels.incorrect : '';

  return (
    <section className="av-dd" data-dd={sidecarId} data-article={articleUid} aria-label={title}>
      <noscript>
        <p className="av-dd-fallback">{fallbackLine}</p>
      </noscript>
      <header className="av-dd-hd">
        <span>{labels.eyebrow}</span>
        <span>{title}</span>
        <button type="button" className="av-dd-reset" aria-label={labels.reset} onClick={onReset}>
          ↻
        </button>
      </header>
      {prompt ? <p className="av-dd-prompt">{prompt}</p> : null}
      <div className="av-dd-board">
        <ol className="av-dd-slots">
          {slots.map((slot, index) => {
            const occupant = board.placement[slot.id] ?? null;
            const text = chipText(chips, occupant);
            const name = slotLabel(slot, index, labels.slotEmpty);
            const focused = board.focus.area === 'slots' && board.focus.index === index;
            const ariaLabel = occupant
              ? `${name}: ${labels.slotFilled} ${text}`
              : `${name}: ${labels.slotEmpty}`;
            return (
              <li key={slot.id} className="av-dd-slot-wrap">
                {slot.label ? <span className="av-dd-slot-label">{slot.label}</span> : null}
                <button
                  type="button"
                  className={`${slotClassName(occupant != null, board.flash[slot.id])}${focused ? ' is-focused' : ''}`}
                  role="button"
                  aria-label={ariaLabel}
                  aria-pressed={board.heldChipId != null && focused}
                  onDragOver={onDragOver}
                  onDrop={(event) => onDropSlot(event, slot.id)}
                  onClick={() => onSlotActivate(index, slot.id)}
                >
                  {text || '\u00a0'}
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className="av-dd-pool"
          role="listbox"
          id={poolId}
          aria-label={labels.pool}
          aria-activedescendant={
            board.focus.area === 'pool' && board.pool[board.focus.index]
              ? `${uid}-chip-${board.pool[board.focus.index]}`
              : undefined
          }
          tabIndex={0}
          onKeyDown={onPoolKeyDown}
          onDragOver={onDragOver}
          onDrop={onDropPool}
        >
          {board.pool.map((chipId, index) => {
            const chip = chips.find((item) => item.id === chipId);
            if (!chip) return null;
            const selected = board.heldChipId === chipId;
            const focused = board.focus.area === 'pool' && board.focus.index === index;
            return (
              <button
                key={chipId}
                type="button"
                id={`${uid}-chip-${chipId}`}
                className={`av-dd-chip${selected ? ' is-selected' : ''}${focused ? ' is-focused' : ''}`}
                role="option"
                aria-selected={selected}
                draggable
                onDragStart={(event) => onDragStart(event, chipId)}
                onClick={() => onChipActivate(chipId, index)}
              >
                {chip.text}
              </button>
            );
          })}
        </div>
      </div>
      <div className="av-dd-actions">
        <button
          type="button"
          className="av-dd-go"
          disabled={!filled || pending || board.verdict === 'correct'}
          onClick={onSubmit}
        >
          {labels.submit}
        </button>
      </div>
      <p className="av-dd-live" id={liveId} aria-live="polite">
        {liveMessage}
      </p>
      {failed ? (
        <p className="av-dd-verdict no" role="alert">
          {labels.error}
        </p>
      ) : null}
      {board.verdict ? (
        <p
          className={`av-dd-verdict${board.verdict === 'correct' ? ' ok' : ' no'}`}
          id={statusId}
          role="status"
        >
          {board.verdict === 'correct' ? labels.correct : labels.incorrect}
        </p>
      ) : null}
      {board.verdict && explanation ? (
        <div className="av-dd-ex">
          <p className="av-dd-ex-l">{labels.explanation}</p>
          <p>{explanation}</p>
        </div>
      ) : null}
    </section>
  );
}

export function DragDrop({
  articleUid,
  sidecarId,
  title,
  prompt,
  explanation,
  fallbackLine,
  slots,
  chips,
  labels,
  gradeAction,
}: DragDropProps) {
  const uid = useId();
  const slotIds = slots.map((slot) => slot.id);
  const chipIds = chips.map((chip) => chip.id);
  const [board, setBoard] = useState<DragDropBoard>(() => createBoard(slotIds, chipIds, sidecarId));
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  function onDragStart(event: DragEvent<HTMLButtonElement>, chipId: string) {
    event.dataTransfer.setData('text/plain', chipId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function onDropSlot(event: DragEvent<HTMLButtonElement>, slotId: string) {
    event.preventDefault();
    const chipId = event.dataTransfer.getData('text/plain');
    if (!chipId) return;
    setBoard((current) => placeChip(current, slotId, chipId));
  }

  function onDropPool(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const chipId = event.dataTransfer.getData('text/plain');
    if (!chipId) return;
    setBoard((current) => returnToPool(current, chipId));
  }

  function onPoolKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    setBoard((current) => handleDragDropKey(current, event.key, slotIds));
  }

  async function onSubmit() {
    if (!everySlotFilled(board.placement, slotIds) || pending || board.verdict === 'correct') return;
    setPending(true);
    setFailed(false);
    try {
      const result = await gradeAction({
        submission: submissionOf(board.placement, slotIds),
        sidecarId,
        articleUid,
      });
      const flashed = applyGrade(board, result);
      setBoard(flashed);
      const settle = () => setBoard((current) => settleGrade(current, result));
      if (prefersReducedMotion()) {
        settle();
      } else {
        window.setTimeout(settle, FLASH_MS);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <DragDropView
      uid={uid}
      articleUid={articleUid}
      sidecarId={sidecarId}
      title={title}
      prompt={prompt}
      explanation={explanation}
      fallbackLine={fallbackLine}
      slots={slots}
      chips={chips}
      labels={labels}
      board={board}
      pending={pending}
      failed={failed}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDropSlot={onDropSlot}
      onDropPool={onDropPool}
      onPoolKeyDown={onPoolKeyDown}
      onSlotActivate={(index, slotId) => {
        setBoard((current) => {
          const focused = { ...current, focus: { area: 'slots' as const, index } };
          if (current.heldChipId) return placeChip(focused, slotId, current.heldChipId);
          return handleDragDropKey(focused, 'Enter', slotIds);
        });
      }}
      onChipActivate={(chipId, index) =>
        setBoard((current) => ({
          ...current,
          heldChipId: current.heldChipId === chipId ? null : chipId,
          focus: { area: 'pool', index },
          flash: {},
          verdict: null,
        }))
      }
      onSubmit={() => {
        void onSubmit();
      }}
      onReset={() => {
        setFailed(false);
        setBoard(resetBoard(slotIds, chipIds, sidecarId));
      }}
    />
  );
}
