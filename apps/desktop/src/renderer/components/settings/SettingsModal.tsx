import { useState, useEffect, useCallback } from "react";
import { X, Mic, Speaker, KeyRound, ToggleLeft, ToggleRight } from "lucide-react";
import { useAppStore, useAudioSettingsStore } from "../../hooks/useAppStore";
import { updateAudioStream } from "../../hooks/useVoice";

type Tab = "voice" | "keybindings";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

export function SettingsModal() {
  const { showSettings, setShowSettings } = useAppStore();
  const { audioSettings, updateAudioSettings } = useAudioSettingsStore();

  const [tab, setTab] = useState<Tab>("voice");
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [capturingMute, setCapturingMute] = useState(false);
  const [capturingDeafen, setCapturingDeafen] = useState(false);

  useEffect(() => {
    if (!showSettings) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs: MediaDeviceInfo[] = [];
      const outputs: MediaDeviceInfo[] = [];
      for (const d of devices) {
        if (d.kind === "audioinput") inputs.push({ deviceId: d.deviceId, label: d.label || `Microphone ${inputs.length + 1}` });
        if (d.kind === "audiooutput") outputs.push({ deviceId: d.deviceId, label: d.label || `Speaker ${outputs.length + 1}` });
      }
      setInputDevices(inputs);
      setOutputDevices(outputs);
    });
  }, [showSettings]);

  const handleInputChange = async (deviceId: string) => {
    updateAudioSettings({ inputDeviceId: deviceId || null });
    await updateAudioStream(null);
  };

  const handleOutputChange = (deviceId: string) => {
    updateAudioSettings({ outputDeviceId: deviceId || null });
  };

  const handleKeyCapture = useCallback(async (e: React.KeyboardEvent, type: "mute" | "deafen") => {
    e.preventDefault();
    e.stopPropagation();
    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push("CommandOrControl");
    if (e.shiftKey) keys.push("Shift");
    if (e.altKey) keys.push("Alt");
    const key = e.key === "Meta" || e.key === "Control" || e.key === "Shift" || e.key === "Alt" ? null : e.key;
    if (key) keys.push(key);
    if (keys.length < 2) return;

    const shortcut = keys.join("+");
    if (type === "mute") {
      updateAudioSettings({ muteShortcut: shortcut });
      setCapturingMute(false);
    } else {
      updateAudioSettings({ deafenShortcut: shortcut });
      setCapturingDeafen(false);
    }

    if ((window as any).electronAPI?.invoke) {
      await (window as any).electronAPI.invoke("shortcuts:register", {
        mute: audioSettings.muteShortcut,
        deafen: audioSettings.deafenShortcut,
      });
    }
  }, [audioSettings, updateAudioSettings]);

  if (!showSettings) return null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "voice", label: "Voice Settings", icon: Mic },
    { key: "keybindings", label: "Keybindings", icon: KeyRound },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]">
      <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Settings</h2>
          <button onClick={() => setShowSettings(false)} className="text-[var(--color-text-muted)] hover:text-white p-1 rounded hover:bg-[var(--color-bg-tertiary)]">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-[var(--color-border)]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t.key
                    ? "bg-[var(--color-bg-tertiary)] text-white border border-[var(--color-border)] border-b-transparent"
                    : "text-[var(--color-text-secondary)] hover:text-white"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {tab === "voice" && (
            <div className="space-y-6">
              {/* Microphone Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Mic size={16} /> Microphone
                </label>
                <select
                  value={audioSettings.inputDeviceId || ""}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default</option>
                  {inputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Speaker Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                  <Speaker size={16} /> Speakers
                </label>
                <select
                  value={audioSettings.outputDeviceId || ""}
                  onChange={(e) => handleOutputChange(e.target.value)}
                  className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Audio Processing Toggles */}
              <div className="space-y-3 pt-2 border-t border-[var(--color-border)]">
                <h4 className="text-xs uppercase tracking-wide font-bold text-[var(--color-text-secondary)]">Audio Processing</h4>
                {([
                  { key: "echoCancellation" as const, label: "Echo Cancellation" },
                  { key: "noiseSuppression" as const, label: "Noise Suppression" },
                  { key: "autoGainControl" as const, label: "Auto Gain Control" },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-primary)]">{item.label}</span>
                    <button
                      onClick={() => updateAudioSettings({ [item.key]: !audioSettings[item.key] })}
                      className={`p-1 rounded transition-colors ${audioSettings[item.key] ? "text-green-400" : "text-[var(--color-text-muted)]"}`}
                    >
                      {audioSettings[item.key] ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "keybindings" && (
            <div className="space-y-6">
              <p className="text-sm text-[var(--color-text-secondary)]">Global hotkeys work even when BaatCheet is minimized.</p>

              {/* Mute Keybinding */}
              <div>
                <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Toggle Mute</label>
                <button
                  onClick={() => { setCapturingMute(true); setCapturingDeafen(false); }}
                  onKeyDown={(e) => capturingMute && handleKeyCapture(e, "mute")}
                  className={`w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-left outline-none focus:ring-2 focus:ring-blue-500 ${capturingMute ? "ring-2 ring-yellow-500" : ""}`}
                  tabIndex={0}
                >
                  {capturingMute ? "Press keys..." : audioSettings.muteShortcut || "Not set"}
                </button>
              </div>

              {/* Deafen Keybinding */}
              <div>
                <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">Toggle Deafen</label>
                <button
                  onClick={() => { setCapturingDeafen(true); setCapturingMute(false); }}
                  onKeyDown={(e) => capturingDeafen && handleKeyCapture(e, "deafen")}
                  className={`w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-left outline-none focus:ring-2 focus:ring-blue-500 ${capturingDeafen ? "ring-2 ring-yellow-500" : ""}`}
                  tabIndex={0}
                >
                  {capturingDeafen ? "Press keys..." : audioSettings.deafenShortcut || "Not set"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
