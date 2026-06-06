import { useState } from "react";
import DraftScreen from "./components/DraftScreen";
import GameScreen from "./components/GameScreen";
import MainMenu from "./components/MainMenu";
import MapSelection from "./components/MapSelection";
import RulesScreen from "./components/RulesScreen";
import { getMap, maps } from "./data/maps";
import { createInitialGame, defaultAiTeam } from "./logic/draft";
import type { Faction, GameMode, GameState } from "./types/game";

type Screen = "menu" | "maps" | "draft" | "game" | "rules" | "credits";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("hotseat");
  const [mapId, setMapId] = useState(maps[0].id);
  const [draftFaction, setDraftFaction] = useState<Faction>("humans");
  const [humanTeam, setHumanTeam] = useState<string[]>([]);
  const [zombieTeam, setZombieTeam] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);

  function startMode(nextMode: GameMode) {
    setMode(nextMode);
    setHumanTeam([]);
    setZombieTeam([]);
    setDraftFaction("humans");
    setScreen("maps");
  }

  function chooseMap(nextMapId: string) {
    setMapId(nextMapId);
    setDraftFaction("humans");
    setScreen("draft");
  }

  function addDraftUnit(templateId: string) {
    if (draftFaction === "humans") {
      setHumanTeam((team) => [...team, templateId]);
    } else {
      setZombieTeam((team) => [...team, templateId]);
    }
  }

  function removeDraftUnit(index: number) {
    if (draftFaction === "humans") {
      setHumanTeam((team) => team.filter((_, candidateIndex) => candidateIndex !== index));
    } else {
      setZombieTeam((team) => team.filter((_, candidateIndex) => candidateIndex !== index));
    }
  }

  function launchGame(finalHumanTeam: string[], finalZombieTeam: string[]) {
    setGameState(createInitialGame(mode, getMap(mapId), finalHumanTeam, finalZombieTeam));
    setScreen("game");
  }

  function confirmDraft() {
    if (mode === "hotseat" && draftFaction === "humans") {
      setDraftFaction("zombies");
      return;
    }

    if (mode === "ai") {
      launchGame(humanTeam, defaultAiTeam());
      return;
    }

    launchGame(humanTeam, zombieTeam);
  }

  function backFromDraft() {
    if (draftFaction === "zombies") {
      setDraftFaction("humans");
    } else {
      setScreen("maps");
    }
  }

  if (screen === "rules") {
    return <RulesScreen onBack={() => setScreen("menu")} />;
  }

  if (screen === "credits") {
    return <RulesScreen onBack={() => setScreen("menu")} showCredits />;
  }

  if (screen === "maps") {
    return <MapSelection maps={maps} onSelect={chooseMap} onBack={() => setScreen("menu")} />;
  }

  if (screen === "draft") {
    return (
      <DraftScreen
        faction={draftFaction}
        selectedTeam={draftFaction === "humans" ? humanTeam : zombieTeam}
        onAdd={addDraftUnit}
        onRemove={removeDraftUnit}
        onConfirm={confirmDraft}
        onBack={backFromDraft}
      />
    );
  }

  if (screen === "game" && gameState) {
    return (
      <GameScreen
        state={gameState}
        onStateChange={setGameState}
        onExit={() => {
          setGameState(null);
          setScreen("menu");
        }}
      />
    );
  }

  return <MainMenu onStart={startMode} onRules={() => setScreen("rules")} onCredits={() => setScreen("credits")} />;
}
