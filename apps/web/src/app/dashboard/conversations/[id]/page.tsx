'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPhone, formatTime } from '@/lib/formatters';
import { toast } from 'sonner';
import type { Conversation } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_human: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  pending_human: 'Pendente',
  closed: 'Encerrada',
};

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchConversation(showLoading = true) {
    if (showLoading) setLoading(true);
    const res = await api.get<Conversation>(`/conversations/${id}`);
    if (res.success && res.data) {
      setConversation(res.data);
    }
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    fetchConversation();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  async function handleSendReply() {
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await api.post(`/conversations/${id}/reply`, { message: replyText.trim() });
      if (res.success) {
        setReplyText('');
        toast.success('Mensagem enviada!');
        // Recarregar conversa para mostrar a nova mensagem
        await fetchConversation(false);
      } else {
        toast.error(res.error?.message || 'Erro ao enviar mensagem');
      }
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingReply(false);
    }
  }

  async function handleHandoff() {
    setActionLoading(true);
    const res = await api.patch<Conversation>(`/conversations/${id}/handoff`);
    if (res.success && res.data) {
      setConversation((prev) => prev ? { ...prev, ...res.data, messages: prev.messages } : prev);
    }
    setActionLoading(false);
  }

  async function handleClose() {
    setActionLoading(true);
    const res = await api.patch<Conversation>(`/conversations/${id}/close`);
    if (res.success && res.data) {
      setConversation((prev) => prev ? { ...prev, ...res.data, messages: prev.messages } : prev);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Conversa nao encontrada</p>
        <button
          onClick={() => router.push('/dashboard/conversations')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  const messages = conversation.messages ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg border border-border bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/conversations')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">
              {conversation.contactName ?? 'Sem nome'}
            </p>
            <p className="text-xs text-muted-foreground">
              {conversation.contactPhone ? formatPhone(conversation.contactPhone) : '-'}
            </p>
          </div>
          <span
            className={`ml-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[conversation.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {STATUS_LABEL[conversation.status] ?? conversation.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {conversation.status !== 'closed' && (
            <>
              <button
                onClick={handleHandoff}
                disabled={actionLoading || conversation.status === 'pending_human'}
                className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-100 disabled:opacity-50 transition-colors"
              >
                Handoff
              </button>
              <button
                onClick={handleClose}
                disabled={actionLoading}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border-x border-border bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma mensagem nesta conversa
          </div>
        ) : (
          <div className="space-y-3">
            {messages
              .filter((msg) => msg.role !== 'system')
              .map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-white border border-border text-foreground rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`mt-1 text-[10px] ${
                          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Footer — Reply input */}
      <div className="rounded-b-lg border border-t-0 border-border bg-white px-4 py-3">
        {conversation.status !== 'closed' ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Digite sua resposta..."
              disabled={sendingReply}
              className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyText.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sendingReply ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              )}
              Enviar
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Conversa encerrada. Reabra para responder.
          </p>
        )}
      </div>
    </div>
  );
}
