import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Layers,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { decideBotMove } from '../engine/botAi';
import {
  applyCallUno,
  applyCatchUnoPenalty,
  applyDrawCard,
  applyPassAfterDraw,
  applyPlayCard,
  createSinglePlayerMatch,
  sortHandByColor,
} from '../engine/gameEngine';
import { getPlayableCards } from '../engine/rules';
import {
  CardColor,
  GameState,
  MatchResult,
  SinglePlayerSetupConfig,
  SpecialEffectType,
  UnoCard as UnoCardModel,
} from '../engine/types';
import { HandLayoutMode } from '../storage/types';
import { soundEngine } from '../utilities/soundEngine';
import {
  FrontPerspectiveTable,
  useIsPortrait,
} from '../components/FrontPerspectiveTable';
import { OpponentSeat } from '../components/OpponentSeat';
import { PauseMenuModal } from '../components/PauseMenuModal';
import { PlayerHand } from '../components/PlayerHand';
import { SpecialEffectBanner } from '../components/SpecialEffectBanner';
import { VictoryConfetti } from '../components/VictoryConfetti';
import { WildColorModal } from '../components/WildColorModal';

interface GameBoardScreenProps {
  config: SinglePlayerSetupConfig;
  soundEnabled: boolean;
  handLayoutMode: HandLayoutMode;
  onToggleSound: () => void;
  onChangeHandLayout: (mode: HandLayoutMode) => void;
  onMatchFinish: (result: MatchResult) => void;
  onExitToMenu: () => void;
}

export const GameBoardScreen: React.FC<GameBoardScreenProps> = ({
  config,
  soundEnabled,
  handLayoutMode,
  onToggleSound,
  onChangeHandLayout,
  onMatchFinish,
  onExitToMenu,
}) => {
  const isPortrait = useIsPortrait();
  const [gameState, setGameState] = useState<GameState>(() =>
    createSinglePlayerMatch(config)
  );
  const [isPaused, setIsPaused] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCardModel | null>(
    null
  );
  const [activeEffect, setActiveEffect] = useState<{
    key: string;
    type: SpecialEffectType;
    actorName: string;
    chosenColor?: CardColor;
  } | null>(null);

  const finishedReportedRef = useRef(false);
  const lastSoundEventIdRef = useRef<string | null>(null);

  const humanPlayer = gameState.players[0];
  const opponents = gameState.players.slice(1);
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isHumanTurn =
    !gameState.winnerId && currentPlayer?.id === humanPlayer.id;

  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  const prevDiscard =
    gameState.discardPile.length > 1
      ? gameState.discardPile[gameState.discardPile.length - 2]
      : null;

  const playableCardIds = useMemo(() => {
    if (!isHumanTurn) return new Set<string>();
    const playable = getPlayableCards(humanPlayer.hand, gameState);
    return new Set(playable.map((c) => c.id));
  }, [isHumanTurn, humanPlayer.hand, gameState]);

  const canHumanPressUno =
    !gameState.winnerId &&
    humanPlayer.hand.length <= 2 &&
    humanPlayer.hand.length >= 1 &&
    !humanPlayer.calledUno;

  // Trigger audio & floating effect banners on new game events
  useEffect(() => {
    const evt = gameState.lastEvent;
    if (!evt || evt.id === lastSoundEventIdRef.current) return;
    lastSoundEventIdRef.current = evt.id;

    if (evt.type === 'GAME_START') {
      soundEngine.playCardDeal();
    } else if (evt.type === 'CALL_UNO') {
      soundEngine.playUnoShout();
    } else if (evt.type === 'UNO_PENALTY') {
      soundEngine.playDrawPenalty();
    } else if (evt.type === 'DRAW_CARD') {
      soundEngine.playCardDraw();
    } else if (evt.type === 'PLAY_CARD') {
      if (evt.effectType === 'SKIP') soundEngine.playSkip();
      else if (evt.effectType === 'REVERSE') soundEngine.playReverse();
      else if (evt.effectType === 'DRAW2' || evt.effectType === 'WILD4') {
        soundEngine.playDrawPenalty();
      } else if (evt.effectType === 'WILD') {
        soundEngine.playWild();
      } else {
        soundEngine.playCardPlay();
      }
    }

    if (evt.effectType) {
      setActiveEffect({
        key: evt.id,
        type: evt.effectType,
        actorName: evt.actorName,
        chosenColor: evt.chosenColor,
      });
      const clearTimer = window.setTimeout(() => {
        setActiveEffect((curr) => (curr?.key === evt.id ? null : curr));
      }, 1150);
      return () => window.clearTimeout(clearTimer);
    }
  }, [gameState.lastEvent]);

  // Report match victory/defeat once
  useEffect(() => {
    if (gameState.matchResult && !finishedReportedRef.current) {
      finishedReportedRef.current = true;
      if (gameState.matchResult.winnerId === humanPlayer.id) {
        soundEngine.playVictory();
      } else {
        soundEngine.playDefeat();
      }
      const timer = window.setTimeout(() => {
        if (gameState.matchResult) {
          onMatchFinish(gameState.matchResult);
        }
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [gameState.matchResult, humanPlayer.id, onMatchFinish]);

  // Keyboard shortcut: Esc toggles Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingWildCard) {
          setPendingWildCard(null);
        } else {
          setIsPaused((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingWildCard]);

  // Bot turn scheduler
  useEffect(() => {
    if (isPaused || gameState.winnerId) return;
    const active = gameState.players[gameState.currentTurnIndex];
    if (!active || !active.isBot) return;

    const delayMs = gameState.hasDrawnThisTurn ? 550 : 760;
    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        const actor = prev.players[prev.currentTurnIndex];
        if (!actor || !actor.isBot || prev.winnerId) return prev;

        const decision = decideBotMove(prev, actor);
        let workingState = prev;

        if (decision.type === 'PLAY') {
          if (actor.hand.length === 2) {
            const rememberChance =
              actor.botDifficulty === 'easy'
                ? 0.55
                : actor.botDifficulty === 'normal'
                  ? 0.8
                  : 0.95;
            if (Math.random() < rememberChance) {
              workingState = applyCallUno(workingState, actor.id).state;
            }
          }
          return applyPlayCard(
            workingState,
            actor.id,
            decision.cardId,
            decision.chosenColor
          ).state;
        }

        if (decision.type === 'DRAW') {
          return applyDrawCard(workingState, actor.id).state;
        }

        return applyPassAfterDraw(workingState, actor.id).state;
      });
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isPaused,
    gameState.winnerId,
    gameState.currentTurnIndex,
    gameState.turnCount,
    gameState.hasDrawnThisTurn,
    gameState.players,
  ]);

  // Fair 2.2s window before bot catches human forgetting UNO
  useEffect(() => {
    if (
      isPaused ||
      gameState.winnerId ||
      !gameState.rules.unoPenalty ||
      !humanPlayer.vulnerableToUnoPenalty
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setGameState((prev) => {
        const human = prev.players[0];
        if (!human.vulnerableToUnoPenalty || prev.winnerId) return prev;
        const catcher =
          prev.players.find((p) => p.isBot && p.botDifficulty !== 'easy') ??
          prev.players[1];
        if (!catcher) return prev;
        return applyCatchUnoPenalty(prev, catcher.id, human.id).state;
      });
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [
    isPaused,
    gameState.winnerId,
    gameState.rules.unoPenalty,
    humanPlayer.vulnerableToUnoPenalty,
  ]);

  const handlePlayHumanCard = useCallback(
    (card: UnoCardModel) => {
      if (!isHumanTurn || isPaused) return;
      if (!playableCardIds.has(card.id)) return;

      if (card.color === 'wild') {
        soundEngine.playButtonTap();
        setPendingWildCard(card);
        return;
      }

      setGameState(
        (prev) => applyPlayCard(prev, humanPlayer.id, card.id).state
      );
    },
    [isHumanTurn, isPaused, playableCardIds, humanPlayer.id]
  );

  const handleConfirmWildColor = (color: CardColor) => {
    if (!pendingWildCard) return;
    const cardId = pendingWildCard.id;
    setPendingWildCard(null);
    setGameState(
      (prev) => applyPlayCard(prev, humanPlayer.id, cardId, color).state
    );
  };

  const handleDrawCard = () => {
    if (!isHumanTurn || isPaused) return;
    if (gameState.hasDrawnThisTurn && gameState.pendingDrawCount === 0) return;
    setGameState((prev) => applyDrawCard(prev, humanPlayer.id).state);
  };

  const handlePassTurn = () => {
    if (!isHumanTurn || isPaused || !gameState.hasDrawnThisTurn) return;
    soundEngine.playButtonTap();
    setGameState((prev) => applyPassAfterDraw(prev, humanPlayer.id).state);
  };

  const handlePressUno = () => {
    if (!canHumanPressUno || isPaused) return;
    setGameState((prev) => applyCallUno(prev, humanPlayer.id).state);
  };

  const handleCatchOpponentUno = (targetId: string) => {
    if (isPaused || gameState.winnerId) return;
    setGameState(
      (prev) => applyCatchUnoPenalty(prev, humanPlayer.id, targetId).state
    );
  };

  const handleSortHand = () => {
    soundEngine.playShuffle();
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p, idx) =>
        idx === 0 ? { ...p, hand: sortHandByColor(p.hand) } : p
      ),
    }));
  };

  const handleRestartMatch = () => {
    soundEngine.playCardDeal();
    finishedReportedRef.current = false;
    setPendingWildCard(null);
    setIsPaused(false);
    setGameState(createSinglePlayerMatch(config));
  };

  const controlsBar = (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span
          className={`font-display font-bold text-sm sm:text-base truncate ${
            isHumanTurn ? 'text-amber-300' : 'text-white'
          }`}
        >
          {humanPlayer.name}
        </span>
        <span className="text-xs sm:text-sm text-emerald-200/90 tabular-nums whitespace-nowrap">
          {humanPlayer.hand.length} kartu
        </span>
        {humanPlayer.calledUno && humanPlayer.hand.length === 1 && (
          <span className="text-xs font-display font-black text-amber-300">
            UNO Aktif
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={handleSortHand}
          className="min-h-[48px] px-3 sm:px-3.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
        >
          <ArrowUpDown className="w-4 h-4 text-emerald-300" />
          <span>Urutkan</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onChangeHandLayout(handLayoutMode === 'fan' ? 'stack' : 'fan')
          }
          aria-label={`Ubah tampilan kartu, saat ini Mode ${
            handLayoutMode === 'fan' ? 'Kipas' : 'Tumpuk'
          }`}
          className="min-h-[48px] px-3 sm:px-3.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
        >
          <Layers className="w-4 h-4 text-emerald-300" />
          <span>{handLayoutMode === 'fan' ? 'Kipas' : 'Tumpuk'}</span>
        </button>

        <button
          type="button"
          onClick={handlePressUno}
          disabled={!canHumanPressUno}
          className={`min-h-[50px] px-5 sm:px-7 rounded-xl font-display font-black text-sm sm:text-base tracking-wide transition-transform cursor-pointer whitespace-nowrap border-b-4 ${
            canHumanPressUno
              ? 'bg-gradient-to-br from-red-500 to-amber-500 border-red-800 text-white ring-2 ring-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:scale-105 active:translate-y-0.5'
              : 'bg-white/10 border-black/30 text-white/35 cursor-not-allowed'
          }`}
        >
          UNO!
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <FrontPerspectiveTable
        topBar={
          <>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-100/85">
              <span className="font-display font-extrabold text-amber-300 tracking-wide">
                UNO ARENA
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {gameState.rules.preset === 'CLASSIC' ? 'Classic' : 'House Rules'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
                className="min-w-[48px] min-h-[48px] rounded-xl bg-black/55 hover:bg-black/75 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center justify-center text-white cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4.5 h-4.5 text-amber-300" />
                ) : (
                  <VolumeX className="w-4.5 h-4.5 text-slate-400" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playButtonTap();
                  setIsPaused(true);
                }}
                aria-label="Jeda permainan"
                className="min-w-[48px] min-h-[48px] px-3.5 rounded-xl bg-black/55 hover:bg-black/75 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Jeda</span>
              </button>
            </div>
          </>
        }
        opponentsRow={opponents.map((opp) => (
          <OpponentSeat
            key={opp.id}
            player={opp}
            isCurrentTurn={
              !gameState.winnerId && currentPlayer?.id === opp.id
            }
            canCatchUno={
              gameState.rules.unoPenalty &&
              opp.vulnerableToUnoPenalty &&
              opp.hand.length === 1
            }
            onCatchUno={handleCatchOpponentUno}
            compact={opponents.length >= 4}
          />
        ))}
        turnBanner={
          <div
            key={`turn_${gameState.turnCount}_${currentPlayer?.id ?? ''}`}
            className="animate-turn-pop flex flex-col items-center"
          >
            <div
              className={`px-4 py-1.5 rounded-xl border text-xs sm:text-sm font-display font-bold tracking-wide shadow-md ${
                gameState.winnerId
                  ? 'bg-amber-400 text-slate-950 border-amber-200'
                  : isHumanTurn
                    ? gameState.pendingDrawCount > 0
                      ? 'bg-red-950/95 text-red-100 border-red-400/75'
                      : 'bg-emerald-950/95 text-amber-300 border-amber-400/75'
                    : 'bg-black/55 text-emerald-100 border-white/10'
              }`}
            >
              {gameState.winnerId ? (
                <span>Pemenang: {gameState.matchResult?.winnerName}</span>
              ) : isHumanTurn ? (
                <span>
                  Giliran Kamu ({humanPlayer.name})
                  {gameState.pendingDrawCount > 0 &&
                    ` · Tumpukan +${gameState.pendingDrawCount}`}
                </span>
              ) : (
                <span>Giliran {currentPlayer?.name}...</span>
              )}
            </div>
            {gameState.lastEvent && (
              <div className="mt-0.5 text-[11px] sm:text-xs text-emerald-100/85 truncate max-w-[92vw] sm:max-w-md drop-shadow">
                {gameState.lastEvent.message}
              </div>
            )}
          </div>
        }
        topDiscard={topDiscard}
        prevDiscard={prevDiscard}
        activeColor={gameState.activeColor}
        direction={gameState.direction}
        drawPileCount={gameState.drawPile.length}
        pendingDrawCount={gameState.pendingDrawCount}
        canDrawCard={isHumanTurn && !gameState.hasDrawnThisTurn}
        hasDrawnThisTurn={gameState.hasDrawnThisTurn}
        highlightDrawPile={
          isHumanTurn &&
          !gameState.hasDrawnThisTurn &&
          playableCardIds.size === 0
        }
        onDrawCard={handleDrawCard}
        onPassTurn={handlePassTurn}
        isMyTurn={isHumanTurn}
        bottomDock={
          <footer
            className={`relative z-30 flex flex-col safe-pb transition-colors duration-150 ${
              isHumanTurn
                ? 'bg-gradient-to-t from-black/95 via-emerald-950/65 to-transparent'
                : 'bg-gradient-to-t from-black/90 via-black/45 to-transparent'
            }`}
          >
            {isPortrait ? (
              <>
                <PlayerHand
                  hand={humanPlayer.hand}
                  playableCardIds={playableCardIds}
                  isMyTurn={isHumanTurn}
                  layoutMode={handLayoutMode}
                  isInitialDeal={gameState.turnCount === 1}
                  onPlayCard={handlePlayHumanCard}
                />
                <div className="pt-1">{controlsBar}</div>
              </>
            ) : (
              <>
                {controlsBar}
                <PlayerHand
                  hand={humanPlayer.hand}
                  playableCardIds={playableCardIds}
                  isMyTurn={isHumanTurn}
                  layoutMode={handLayoutMode}
                  isInitialDeal={gameState.turnCount === 1}
                  onPlayCard={handlePlayHumanCard}
                />
              </>
            )}
          </footer>
        }
      />

      {Boolean(gameState.winnerId) && <VictoryConfetti active />}

      {activeEffect && (
        <SpecialEffectBanner
          effectKey={activeEffect.key}
          effectType={activeEffect.type}
          actorName={activeEffect.actorName}
          chosenColor={activeEffect.chosenColor}
        />
      )}

      {pendingWildCard && (
        <WildColorModal
          onSelectColor={handleConfirmWildColor}
          onCancel={() => setPendingWildCard(null)}
        />
      )}

      {isPaused && (
        <PauseMenuModal
          soundEnabled={soundEnabled}
          rules={gameState.rules}
          onToggleSound={onToggleSound}
          onResume={() => {
            soundEngine.playButtonTap();
            setIsPaused(false);
          }}
          onRestart={handleRestartMatch}
          onExitToMenu={onExitToMenu}
        />
      )}
    </div>
  );
};
