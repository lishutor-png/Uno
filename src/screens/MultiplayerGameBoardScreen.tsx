import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Layers,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { sortHandByColor } from '../engine/gameEngine';
import { getPlayableCards } from '../engine/rules';
import {
  CardColor,
  ClientVisibleGameState,
  MatchResult,
  SpecialEffectType,
  UnoCard as UnoCardModel,
} from '../engine/types';
import { HostRoomManager } from '../multiplayer/hostRoomManager';
import {
  LanClientState,
  LanWebSocketClient,
} from '../multiplayer/lanClient';
import {
  getUnoLocalServerPlugin,
  getUnoWifiDirectPlugin,
} from '../multiplayer/nativeBridge';
import { GameActionPayload } from '../multiplayer/types';
import { HandLayoutMode } from '../storage/types';
import { soundEngine } from '../utilities/soundEngine';
import {
  FrontPerspectiveTable,
  useIsPortrait,
} from '../components/FrontPerspectiveTable';
import { OpponentSeat } from '../components/OpponentSeat';
import { PlayerHand } from '../components/PlayerHand';
import { SpecialEffectBanner } from '../components/SpecialEffectBanner';
import { VictoryConfetti } from '../components/VictoryConfetti';
import { WildColorModal } from '../components/WildColorModal';

interface MultiplayerGameBoardScreenProps {
  role: 'HOST' | 'CLIENT';
  hostManager?: HostRoomManager | null;
  lanClient?: LanWebSocketClient | null;
  initialView: ClientVisibleGameState;
  initialClientState?: LanClientState | null;
  soundEnabled: boolean;
  handLayoutMode: HandLayoutMode;
  onToggleSound: () => void;
  onChangeHandLayout: (mode: HandLayoutMode) => void;
  onMatchFinish: (result: MatchResult) => void;
  onExitToMenu: () => void;
}

export const MultiplayerGameBoardScreen: React.FC<
  MultiplayerGameBoardScreenProps
> = ({
  role,
  hostManager,
  lanClient,
  initialView,
  initialClientState,
  soundEnabled,
  handLayoutMode,
  onToggleSound,
  onChangeHandLayout,
  onMatchFinish,
  onExitToMenu,
}) => {
  const isPortrait = useIsPortrait();
  const [view, setView] = useState<ClientVisibleGameState>(initialView);
  const [clientStatus, setClientStatus] = useState<LanClientState | null>(
    initialClientState ?? null
  );
  const [sortOrderIds, setSortOrderIds] = useState<string[] | null>(null);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCardModel | null>(
    null
  );
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [activeEffect, setActiveEffect] = useState<{
    key: string;
    type: SpecialEffectType;
    actorName: string;
    chosenColor?: CardColor;
  } | null>(null);

  const lastEventIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  // Wire Host Manager updates & heartbeat/bot loops when HOST
  useEffect(() => {
    if (role !== 'HOST' || !hostManager) return;

    const refreshHost = () => {
      const nextView = hostManager.getHostVisibleGameState();
      if (nextView) setView(nextView);
    };

    const hbInterval = window.setInterval(() => {
      hostManager.checkHeartbeats();
      refreshHost();
    }, 2000);

    const botInterval = window.setInterval(() => {
      if (hostManager.stepBotTurnIfNeeded()) {
        refreshHost();
      }
    }, 780);

    return () => {
      window.clearInterval(hbInterval);
      window.clearInterval(botInterval);
    };
  }, [role, hostManager]);

  // Trigger audio & effect banners on new game events
  useEffect(() => {
    const evt = view.lastEvent;
    if (!evt || evt.id === lastEventIdRef.current) return;
    lastEventIdRef.current = evt.id;

    if (evt.type === 'CALL_UNO') soundEngine.playUnoShout();
    else if (evt.type === 'UNO_PENALTY') soundEngine.playDrawPenalty();
    else if (evt.type === 'DRAW_CARD') soundEngine.playCardDraw();
    else if (evt.type === 'PLAY_CARD') {
      if (evt.effectType === 'SKIP') soundEngine.playSkip();
      else if (evt.effectType === 'REVERSE') soundEngine.playReverse();
      else if (evt.effectType === 'DRAW2' || evt.effectType === 'WILD4') {
        soundEngine.playDrawPenalty();
      } else if (evt.effectType === 'WILD') soundEngine.playWild();
      else soundEngine.playCardPlay();
    }

    if (evt.effectType) {
      setActiveEffect({
        key: evt.id,
        type: evt.effectType,
        actorName: evt.actorName,
        chosenColor: evt.chosenColor,
      });
      const timer = window.setTimeout(() => {
        setActiveEffect((curr) => (curr?.key === evt.id ? null : curr));
      }, 1150);
      return () => window.clearTimeout(timer);
    }
  }, [view.lastEvent]);

  // Listen for match finish
  useEffect(() => {
    if (view.matchResult && !finishedRef.current) {
      finishedRef.current = true;
      const isWinner = view.matchResult.winnerId === view.selfPlayerId;
      if (isWinner) soundEngine.playVictory();
      else soundEngine.playDefeat();

      const timer = window.setTimeout(() => {
        if (view.matchResult) onMatchFinish(view.matchResult);
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [view.matchResult, view.selfPlayerId, onMatchFinish]);

  // Keep local client callbacks attached
  useEffect(() => {
    if (role !== 'CLIENT' || !lanClient) return;
    const clientInternal = lanClient as unknown as {
      opts: {
        onStateChange: (s: LanClientState) => void;
        onActionRejected?: (r: string) => void;
        onKickedOrClosed?: (r: string) => void;
      };
    };
    clientInternal.opts.onStateChange = (next) => {
      setClientStatus(next);
      if (next.gameState) setView(next.gameState);
    };
    clientInternal.opts.onActionRejected = (reason) => {
      setActionToast(reason);
      window.setTimeout(() => setActionToast(null), 2600);
    };
    clientInternal.opts.onKickedOrClosed = (reason) => {
      setActionToast(reason);
    };
  }, [role, lanClient]);

  const isSpectator =
    role === 'HOST' && hostManager?.config.hostMode === 'SPECTATOR';

  const displayedHand = useMemo(() => {
    if (!sortOrderIds) return view.selfHand;
    const rank = new Map(sortOrderIds.map((id, idx) => [id, idx]));
    return [...view.selfHand].sort((a, b) => {
      const ra = rank.get(a.id) ?? 999;
      const rb = rank.get(b.id) ?? 999;
      return ra - rb;
    });
  }, [view.selfHand, sortOrderIds]);

  const isMyTurn =
    !isSpectator &&
    !view.winnerId &&
    view.currentTurnPlayerId === view.selfPlayerId;

  const playableCardIds = useMemo(() => {
    if (!isMyTurn) return new Set<string>();
    const playable = getPlayableCards(view.selfHand, {
      discardPile: [view.topDiscard],
      activeColor: view.activeColor,
      pendingDrawCount: view.pendingDrawCount,
      pendingDrawType: view.pendingDrawType,
      rules: view.rules,
      hasDrawnThisTurn: view.hasDrawnThisTurn,
      drawnCardIdThisTurn: view.drawnCardIdThisTurn,
    });
    return new Set(playable.map((c) => c.id));
  }, [isMyTurn, view]);

  const dispatchAction = useCallback(
    (action: GameActionPayload) => {
      if (role === 'HOST' && hostManager) {
        const res = hostManager.applyHostLocalAction(
          `host_act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          action
        );
        if (!res.ok && res.error) {
          setActionToast(res.error);
          window.setTimeout(() => setActionToast(null), 2400);
        } else {
          const next = hostManager.getHostVisibleGameState();
          if (next) setView(next);
        }
      } else if (role === 'CLIENT' && lanClient) {
        lanClient.sendGameAction(action);
      }
    },
    [role, hostManager, lanClient]
  );

  const handleExit = () => {
    if (role === 'HOST') {
      hostManager?.closeRoom('Host menutup pertandingan.');
      void getUnoLocalServerPlugin()?.stopServer();
      void getUnoWifiDirectPlugin()?.removeGroup();
    } else {
      lanClient?.leaveRoom();
    }
    onExitToMenu();
  };

  const opponents = view.players.filter((p) => p.id !== view.selfPlayerId);
  const currentTurnPlayer = view.players.find(
    (p) => p.id === view.currentTurnPlayerId
  );
  const canPressUno =
    !isSpectator &&
    !view.winnerId &&
    view.selfHand.length <= 2 &&
    view.selfHand.length >= 1 &&
    !view.selfCalledUno;

  return (
    <div className="relative w-full h-full">
      <FrontPerspectiveTable
        topBar={
          <>
            <div className="flex items-center gap-2 text-xs text-emerald-100/85">
              <span className="font-display font-extrabold text-amber-300 text-sm tracking-wide">
                UNO ARENA
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {role === 'HOST'
                  ? 'Host Otoritatif'
                  : clientStatus?.status === 'RECONNECTING'
                    ? 'Menghubungkan ulang...'
                    : `Terhubung${clientStatus?.latencyMs ? ` · ${clientStatus.latencyMs}ms` : ''}`}
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
                onClick={handleExit}
                className="min-w-[48px] min-h-[48px] px-3.5 rounded-xl bg-red-600/85 hover:bg-red-500 border-b-2 border-red-900 active:translate-y-0.5 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </>
        }
        opponentsRow={opponents.map((opp) => (
          <OpponentSeat
            key={opp.id}
            player={opp}
            isCurrentTurn={
              !view.winnerId && view.currentTurnPlayerId === opp.id
            }
            canCatchUno={
              !isSpectator &&
              view.rules.unoPenalty &&
              opp.vulnerableToUnoPenalty &&
              opp.cardCount === 1
            }
            onCatchUno={(targetId) =>
              dispatchAction({ type: 'CATCH_UNO', targetPlayerId: targetId })
            }
            compact={opponents.length >= 4}
          />
        ))}
        turnBanner={
          <div className="flex flex-col items-center">
            <div
              className={`px-4 py-1 rounded-xl border text-xs sm:text-sm font-display font-bold shadow-md ${
                isMyTurn
                  ? 'bg-emerald-950/95 text-amber-300 border-amber-400/75'
                  : 'bg-black/55 text-emerald-100 border-white/10'
              }`}
            >
              {view.winnerId
                ? `Pemenang: ${view.matchResult?.winnerName}`
                : isMyTurn
                  ? `Giliran Kamu${view.pendingDrawCount > 0 ? ` · Tumpukan +${view.pendingDrawCount}` : ''}`
                  : `Giliran ${currentTurnPlayer?.name ?? '...'}`}
            </div>
            {view.lastEvent && (
              <div className="mt-0.5 text-[11px] sm:text-xs text-emerald-100/85 truncate max-w-md drop-shadow">
                {view.lastEvent.message}
              </div>
            )}
            {actionToast && (
              <div className="mt-1 rounded-lg bg-red-900/90 border border-red-400 px-3 py-1 text-xs font-semibold text-white">
                {actionToast}
              </div>
            )}
          </div>
        }
        topDiscard={view.topDiscard}
        activeColor={view.activeColor}
        direction={view.direction}
        drawPileCount={view.drawPileCount}
        pendingDrawCount={view.pendingDrawCount}
        canDrawCard={isMyTurn && !view.hasDrawnThisTurn}
        hasDrawnThisTurn={view.hasDrawnThisTurn}
        highlightDrawPile={
          isMyTurn && !view.hasDrawnThisTurn && playableCardIds.size === 0
        }
        onDrawCard={() => dispatchAction({ type: 'DRAW_CARD' })}
        onPassTurn={() => dispatchAction({ type: 'PASS_TURN' })}
        isMyTurn={isMyTurn}
        bottomDock={
          isSpectator ? (
            <footer className="relative z-30 px-4 py-4 safe-pb bg-black/70 border-t border-white/10 text-center text-xs sm:text-sm text-emerald-100">
              Mode Pengelola (Spectator) — Anda mengawasi jalannya
              pertandingan tanpa melihat kartu privat pemain.
            </footer>
          ) : (
            <footer
              className={`relative z-30 flex flex-col safe-pb transition-colors duration-150 ${
                isMyTurn
                  ? 'bg-gradient-to-t from-black/95 via-emerald-950/65 to-transparent'
                  : 'bg-gradient-to-t from-black/90 via-black/45 to-transparent'
              }`}
            >
              {(() => {
                const mpControls = (
                  <div className="flex items-center justify-between gap-2 px-3 sm:px-6">
                    <div className="text-sm sm:text-base font-display font-bold text-white tabular-nums">
                      Kartu Saya ({view.selfHand.length})
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playShuffle();
                          setSortOrderIds(
                            sortHandByColor(view.selfHand).map((c) => c.id)
                          );
                        }}
                        className="min-h-[48px] px-3 sm:px-3.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
                      >
                        <ArrowUpDown className="w-4 h-4 text-emerald-300" />
                        <span>Urutkan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onChangeHandLayout(
                            handLayoutMode === 'fan' ? 'stack' : 'fan'
                          )
                        }
                        className="min-h-[48px] px-3 sm:px-3.5 rounded-xl bg-black/60 hover:bg-black/80 border border-white/15 border-b-2 border-b-black/60 active:translate-y-0.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
                      >
                        <Layers className="w-4 h-4 text-emerald-300" />
                        <span>
                          {handLayoutMode === 'fan' ? 'Kipas' : 'Tumpuk'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => dispatchAction({ type: 'CALL_UNO' })}
                        disabled={!canPressUno}
                        className={`min-h-[50px] px-5 sm:px-7 rounded-xl font-display font-black text-sm sm:text-base border-b-4 cursor-pointer whitespace-nowrap ${
                          canPressUno
                            ? 'bg-gradient-to-br from-red-500 to-amber-500 border-red-800 text-white ring-2 ring-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.65)] active:translate-y-0.5'
                            : 'bg-white/10 border-black/30 text-white/35 cursor-not-allowed'
                        }`}
                      >
                        UNO!
                      </button>
                    </div>
                  </div>
                );

                const handComponent = (
                  <PlayerHand
                    hand={displayedHand}
                    playableCardIds={playableCardIds}
                    isMyTurn={isMyTurn}
                    layoutMode={handLayoutMode}
                    onPlayCard={(card) => {
                      if (!isMyTurn || !playableCardIds.has(card.id)) return;
                      if (card.color === 'wild') {
                        setPendingWildCard(card);
                      } else {
                        dispatchAction({ type: 'PLAY_CARD', cardId: card.id });
                      }
                    }}
                  />
                );

                return isPortrait ? (
                  <>
                    {handComponent}
                    <div className="pt-1">{mpControls}</div>
                  </>
                ) : (
                  <>
                    {mpControls}
                    {handComponent}
                  </>
                );
              })()}
            </footer>
          )
        }
      />

      {Boolean(view.winnerId) && <VictoryConfetti active />}

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
          onSelectColor={(color) => {
            const cardId = pendingWildCard.id;
            setPendingWildCard(null);
            dispatchAction({
              type: 'PLAY_CARD',
              cardId,
              chosenColor: color,
            });
          }}
          onCancel={() => setPendingWildCard(null)}
        />
      )}
    </div>
  );
};
