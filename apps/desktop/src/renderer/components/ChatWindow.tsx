import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAppStore } from "../hooks/useAppStore";
import { useVoice } from "../hooks/useVoice";
import { Send, Edit2, Reply, Smile, Trash2, Paperclip, X, Phone } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { MembersSidebar } from "./MembersSidebar";
import { VoiceChannelView } from "./VoiceChannelView";

function ImageLoader({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div 
      className={`relative mt-2 inline-block rounded-md overflow-hidden transition-all duration-300 ${
        loaded ? "" : "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]"
      }`}
      style={{ minHeight: loaded ? "auto" : "150px", minWidth: loaded ? "auto" : "200px" }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-tertiary)]" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`max-w-sm max-h-80 object-contain block transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export function ChatWindow() {
  const me = useQuery(api.users.getMe);

  const { view, activeServerId, activeChannelId, activeDmThreadId } = useAppStore();
  const { requestCall } = useVoice();

  // Find active channel to detect its type
  const channels = useQuery(api.channels.list, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");
  const activeChannel = channels?.find((c) => c._id === activeChannelId);
  const isVoiceChannel = activeChannel?.type === "voice";

  const isChannel = view === "servers" && activeChannelId && !isVoiceChannel;
  const isDM = view === "dms" && activeDmThreadId;

  const dmThreads = useQuery(api.dms.list);
  const activeDmThread = dmThreads?.find((t) => t._id === activeDmThreadId);
  const otherUser = activeDmThread?.otherUsers[0];

  const channelMessages = useQuery(
    api.messages.listByChannel,
    isChannel ? { channelId: activeChannelId as Id<"channels"> } : "skip",
  );
  const dmMessages = useQuery(
    api.messages.listByDM,
    isDM
      ? { dmThreadId: activeDmThreadId as Id<"directMessageThreads"> }
      : "skip",
  );

  const messages = isChannel ? channelMessages : dmMessages;
  const sendMessage = useMutation(api.messages.send);
  const editMessage = useMutation(api.messages.edit);
  const removeMessage = useMutation(api.messages.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const toggleReaction = useMutation(api.reactions.toggleReaction);
  const servers = useQuery(api.servers.list);
  const activeServer = servers?.find((s) => s._id === activeServerId);
  const membersList = useQuery(api.servers.listMembers, activeServerId ? { serverId: activeServerId as Id<"servers"> } : "skip");
  const myMembership = membersList?.find((m) => m.userId === me?._id);
  const canDeleteAny = activeServer?.ownerId === me?._id || myMembership?.role === "admin" || myMembership?.role === "owner";

  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [reactionPopoverId, setReactionPopoverId] =
    useState<Id<"messages"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
  const [replyingTo, setReplyingTo] = useState<{
    id: Id<"messages">;
    text: string;
    sender: string;
  } | null>(null);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<
    "input" | Id<"messages"> | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !selectedFile) || !me || (!isChannel && !isDM)) return;

    if (editingId && text) {
      await editMessage({ messageId: editingId, newText: text });
      setEditingId(null);
    } else {
      setIsUploading(true);
      try {
        let fileId: Id<"_storage"> | undefined;
        if (selectedFile) {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": selectedFile.type },
            body: selectedFile,
          });
          const { storageId } = await result.json();
          fileId = storageId;
        }

        await sendMessage({
          text,
          channelId: isChannel
            ? (activeChannelId as Id<"channels">)
            : undefined,
          dmThreadId: isDM
            ? (activeDmThreadId as Id<"directMessageThreads">)
            : undefined,
          replyToMessageId: replyingTo?.id,
          fileId,
        });
      } finally {
        setIsUploading(false);
      }
    }

    setInput("");
    setSelectedFile(null);
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape") {
      setEditingId(null);
      setReplyingTo(null);
      setEmojiPickerTarget(null);
      if (editingId) setInput("");
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    if (emojiPickerTarget === "input") {
      setInput((prev) => prev + emojiData.emoji);
    } else if (emojiPickerTarget) {
      toggleReaction({
        messageId: emojiPickerTarget,
        emoji: emojiData.emoji,
      });
    }
    setEmojiPickerTarget(null);
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return (
        "Today at " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const scrollToMessage = (id: Id<"messages">) => {
    const el = document.getElementById(`message-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-blue-500/20");
      setTimeout(() => el.classList.remove("bg-blue-500/20"), 1500);
    }
  };

  if (!isChannel && !isDM) {
    // If a voice channel is active in the sidebar, show VoiceChannelView
    if (isVoiceChannel && activeChannel) {
      return <VoiceChannelView channelName={activeChannel.name} />;
    }
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--color-bg-primary)]">
        <p className="text-[var(--color-text-secondary)]">
          Select a channel or DM to start messaging
        </p>
      </div>
    );
  }

  const displayMessages = messages ? [...messages].reverse() : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col bg-[var(--color-bg-primary)] min-w-0">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            {isChannel ? (
              <>
                <span className="text-[var(--color-text-muted)] text-xl">
                  #
                </span>{" "}
                Channel Chat
              </>
            ) : (
              "Direct Message"
            )}
          </h2>
          {isDM && me && otherUser && (
            <button
              onClick={() => {
                requestCall(
                  otherUser._id,
                  me._id,
                  me.displayName ?? me.username,
                  activeDmThreadId || "",
                  otherUser.displayName ?? otherUser.username
                );
              }}
              className="p-2 text-[var(--color-text-muted)] hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
              title="Start voice call"
            >
              <Phone size={18} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!messages ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--color-text-secondary)]">Loading...</p>
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--color-text-secondary)]">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayMessages.map((msg) => (
                <div
                  id={`message-${msg._id}`}
                  key={msg._id}
                  className="group flex flex-col hover:bg-[var(--color-bg-tertiary)] px-4 py-1 -mx-4 rounded-none transition-colors relative mt-1"
                >
                  {/* Reply Context */}
                  {msg.repliedMessage && (
                    <div
                      className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1 ml-10 cursor-pointer hover:text-[var(--color-text-primary)] select-none before:content-[''] before:w-6 before:h-3 before:border-l-2 before:border-t-2 before:border-[var(--color-border)] before:rounded-tl-md before:mr-1 before:-mt-2"
                      onClick={() => scrollToMessage(msg.repliedMessage!._id)}
                    >
                      {msg.repliedMessage.sender?.avatarUrl && (
                        <img
                          src={msg.repliedMessage.sender.avatarUrl}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                      <span className="font-semibold hover:underline">
                        @{msg.repliedMessage.sender?.displayName}
                      </span>
                      <span className="truncate max-w-[50vw]">
                        {msg.repliedMessage.text}
                      </span>
                    </div>
                  )}

                  {/* Message Layout */}
                  <div className="flex items-start gap-4">
                    {msg.sender?.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt={msg.sender.displayName}
                        className="w-10 h-10 rounded-full mt-0.5 object-cover cursor-pointer hover:opacity-80"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mt-0.5 shrink-0 cursor-pointer hover:opacity-80">
                        {msg.sender?.displayName?.[0] || "?"}
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-[var(--color-text-primary)] hover:underline cursor-pointer">
                          {msg.sender?.displayName || "Unknown"}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {formatTime(msg._creationTime)}
                        </span>
                        {msg.editedAt && (
                          <span className="text-[10px] text-[var(--color-text-muted)] italic">
                            (edited)
                          </span>
                        )}
                      </div>
                      <p className="text-[var(--color-text-primary)] mt-0.5 whitespace-pre-wrap break-words leading-[1.375rem]">
                        {msg.text}
                      </p>
                      {msg.fileUrl && (
                        <ImageLoader src={msg.fileUrl} alt="uploaded" />
                      )}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(
                            msg.reactions.reduce((acc: any, r: any) => {
                              if (!acc[r.emoji])
                                acc[r.emoji] = {
                                  count: 0,
                                  me: false,
                                  users: [],
                                };
                              acc[r.emoji].count++;
                              if (r.userId === me?._id) acc[r.emoji].me = true;
                              acc[r.emoji].users.push(
                                r.user?.displayName || "Unknown",
                              );
                              return acc;
                            }, {}),
                          ).map(([emoji, data]: [string, any]) => (
                            <button
                              key={emoji}
                              onClick={() =>
                                  toggleReaction({
                                    messageId: msg._id,
                                    emoji,
                                  })
                              }
                              title={data.users.join(", ")}
                              className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded transition-colors ${
                                data.me
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-transparent hover:border-[var(--color-border)]"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{data.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {/* Actions */}
                  <div className="absolute right-4 -top-2 opacity-0 group-hover:opacity-100 flex gap-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-sm p-0.5 transition-opacity z-10">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setReactionPopoverId(
                            reactionPopoverId === msg._id ? null : msg._id,
                          )
                        }
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded"
                        title="React"
                      >
                        <Smile size={16} />
                      </button>
                      {reactionPopoverId === msg._id && (
                        <div className="absolute bottom-full right-0 mb-1 flex gap-1 p-1.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-xl items-center z-20">
                          {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                            <button
                              key={emoji}
                              className="hover:scale-125 transition-transform p-1"
                              onClick={() => {
                                toggleReaction({
                                  messageId: msg._id,
                                  emoji,
                                });
                                setReactionPopoverId(null);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
                          <button
                            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                            title="More Emojis"
                            onClick={() => {
                              setEmojiPickerTarget(
                                emojiPickerTarget === msg._id ? null : msg._id,
                              );
                              setReactionPopoverId(null);
                            }}
                          >
                            <Smile size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setReplyingTo({
                          id: msg._id,
                          text: msg.text,
                          sender: msg.sender?.displayName || "Unknown",
                        })
                      }
                      className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded"
                      title="Reply"
                    >
                      <Reply size={16} />
                    </button>
                    {me?._id === msg.senderId && (
                      <button
                        onClick={() => {
                          setEditingId(msg._id);
                          setInput(msg.text);
                          setReplyingTo(null);
                        }}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {(me?._id === msg.senderId || canDeleteAny) && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this message?",
                            )
                          ) {
                            removeMessage({
                              messageId: msg._id,
                            });
                          }
                        }}
                        className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-6 pt-1 bg-[var(--color-bg-primary)]">
          {replyingTo && (
            <div className="flex items-center justify-between bg-[var(--color-bg-tertiary)] px-3 py-2 rounded-t-lg text-sm border-l-4 border-[var(--color-text-secondary)] mx-1">
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-[var(--color-text-secondary)] font-semibold text-xs mb-0.5">
                  Replying to @{replyingTo.sender}
                </span>
                <span className="text-[var(--color-text-primary)] truncate text-xs">
                  {replyingTo.text}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-[var(--color-text-muted)] hover:text-white ml-2 p-1 rounded-full hover:bg-[var(--color-bg-secondary)]"
              >
                ✕
              </button>
            </div>
          )}
          {editingId && (
            <div className="flex items-center justify-between text-xs text-blue-400 mx-1 mb-2 font-semibold">
              <span>Editing Message</span>
              <button
                onClick={() => {
                  setEditingId(null);
                  setInput("");
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center relative bg-[var(--color-bg-tertiary)] rounded-lg mx-1 overflow-visible">
            <button
              onClick={() =>
                setEmojiPickerTarget(
                  emojiPickerTarget === "input" ? null : "input",
                )
              }
              className="pl-3 pr-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Smile size={20} />
            </button>
            {emojiPickerTarget && (
              <div
                className={`absolute z-50 shadow-2xl bottom-12 ${emojiPickerTarget === "input" ? "left-0" : "right-0"}`}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="pl-2 pr-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }}
            />
            {selectedFile && previewUrl && (
              <div className="absolute -top-32 left-0 bg-[var(--color-bg-tertiary)] p-2 rounded border border-[var(--color-border)] flex flex-col items-center gap-2 shadow-lg z-20">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="h-20 w-auto rounded object-cover"
                  />
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                  >
                    <X size={12} />
                  </button>
                </div>
                <span className="text-xs text-[var(--color-text-primary)] max-w-[150px] truncate">
                  {selectedFile.name}
                </span>
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isChannel ? "Message channel..." : "Send direct message..."
              }
              className="flex-1 bg-transparent pr-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
            />
            <div className="pr-2">
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedFile) || isUploading}
                className="rounded-full p-2 flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Users Sidebar (Discord Style) */}
      {isChannel && activeServerId && (
        <MembersSidebar serverId={activeServerId as Id<"servers">} />
      )}
    </div>
  );
}
