'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface KnowledgeDocument {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  chunkCount: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  content: string;
  similarity: number;
  documentName: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [fileName, setFileName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await api.get<KnowledgeDocument[]>('/knowledge');
    if (res.success && res.data) {
      setDocuments(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function resetUpload() {
    setShowUpload(false);
    setFileName('');
    setTextContent('');
    setUploadError('');
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!fileName.trim()) {
      setUploadError('Nome do arquivo e obrigatorio');
      return;
    }
    if (!textContent.trim()) {
      setUploadError('Cole o conteudo do documento');
      return;
    }

    setUploading(true);
    setUploadError('');

    const res = await api.post<KnowledgeDocument>('/knowledge/upload', {
      fileName: fileName.trim(),
      textContent: textContent.trim(),
    });

    setUploading(false);

    if (res.success) {
      resetUpload();
      fetchDocuments();
    } else {
      setUploadError(res.error?.message || 'Erro ao enviar documento');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
    const res = await api.delete(`/knowledge/${id}`);
    if (res.success) {
      fetchDocuments();
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setSearchError('Digite uma pergunta');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setHasSearched(true);

    const res = await api.post<SearchResult[]>('/knowledge/search', {
      query: searchQuery.trim(),
    });

    setSearching(false);

    if (res.success && res.data) {
      setSearchResults(res.data);
    } else {
      setSearchError(res.error?.message || 'Erro na busca');
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Pronto
          </span>
        );
      case 'processing':
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Processando
          </span>
        );
      case 'error':
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Erro
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 mt-1">
            Envie documentos para a IA responder duvidas sobre seu negocio
          </p>
        </div>
        <button
          onClick={() => {
            resetUpload();
            setShowUpload(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          + Novo Documento
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enviar Documento</h2>
          <p className="text-sm text-gray-500 mb-4">
            Cole o conteudo do seu PDF (tabela de precos, politicas, protocolos, etc.)
          </p>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do documento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Ex: Tabela de Precos 2026, Politica de Cancelamento..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteudo do documento <span className="text-red-500">*</span>
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none font-mono text-sm"
                placeholder="Cole aqui o texto extraido do PDF..."
              />
              {textContent && (
                <p className="text-xs text-gray-400 mt-1">
                  {textContent.length.toLocaleString('pt-BR')} caracteres
                </p>
              )}
            </div>

            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {uploading ? 'Processando...' : 'Enviar e Processar'}
              </button>
              <button
                type="button"
                onClick={resetUpload}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-gray-500">Nenhum documento na base de conhecimento.</p>
          <p className="text-sm text-gray-400 mt-1">
            Clique em &quot;Novo Documento&quot; para enviar informacoes do seu negocio.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tamanho
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Trechos
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{doc.fileName}</p>
                        {doc.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5 line-clamp-1">{doc.errorMessage}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-700">{formatFileSize(doc.fileSize)}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-700">{doc.chunkCount ?? '-'}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {statusBadge(doc.status)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm text-gray-500">{formatDate(doc.createdAt)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.id, doc.fileName)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search / Test Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Testar Base de Conhecimento</h2>
        <p className="text-sm text-gray-500 mb-4">
          Faca uma pergunta para ver o que a IA encontraria na base
        </p>

        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            placeholder="Ex: Qual o preco da consulta? Qual a politica de cancelamento?"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {searchError && <p className="text-sm text-red-600 mt-3">{searchError}</p>}

        {hasSearched && !searching && searchResults.length === 0 && !searchError && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500">
              Nenhum resultado encontrado. A IA nao encontrou informacoes relevantes na base.
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}:
            </p>
            {searchResults.map((result, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    Fonte: {result.documentName}
                  </span>
                  <span className="text-xs font-medium text-green-600">
                    {(result.similarity * 100).toFixed(0)}% relevante
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
