'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type SourceKind = 'rss' | 'http_json' | 'web_scraper'

interface UserSource {
  id: string
  name: string
  description?: string
  kind: SourceKind
  config_jsonb: any
  normalization_jsonb?: any
  visibility: 'private' | 'shared' | 'public'
  created_at: string
  last_fetched_at?: string
  fetch_count: number
}

export default function SourcesDevPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<UserSource[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sourceKind, setSourceKind] = useState<SourceKind>('rss')

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>('private')

  // RSS fields
  const [feedUrl, setFeedUrl] = useState('')
  const [maxItems, setMaxItems] = useState(10)

  // HTTP JSON fields
  const [httpUrl, setHttpUrl] = useState('')
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('GET')
  const [headers, setHeaders] = useState('')
  const [body, setBody] = useState('')
  const [jsonPath, setJsonPath] = useState('$')

  // Web Scraper fields
  const [webUrl, setWebUrl] = useState('')
  const [extractMode, setExtractMode] = useState<'single' | 'list'>('single')
  const [containerSelector, setContainerSelector] = useState('')
  const [titleSelector, setTitleSelector] = useState('')
  const [summarySelector, setSummarySelector] = useState('')
  const [contentSelector, setContentSelector] = useState('')
  const [authorSelector, setAuthorSelector] = useState('')
  const [dateSelector, setDateSelector] = useState('')
  const [linksSelector, setLinksSelector] = useState('')
  const [webMaxItems, setWebMaxItems] = useState(1)

  // Normalization fields
  const [idPath, setIdPath] = useState('')
  const [titlePath, setTitlePath] = useState('')
  const [summaryPath, setSummaryPath] = useState('')
  const [urlPath, setUrlPath] = useState('')
  const [publishedAtPath, setPublishedAtPath] = useState('')
  const [authorPath, setAuthorPath] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Skip auth check for dev page
    setLoading(false)
    loadSources()
  }, [])

  async function loadSources() {
    try {
      const { data, error } = await supabase
        .from('user_sources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSources(data || [])
    } catch (err: any) {
      setError(`Failed to load sources: ${err.message}`)
    }
  }

  async function handleCreateSource(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Build config
      let config: any
      if (sourceKind === 'rss') {
        config = {
          feedUrl,
          maxItems,
        }
      } else if (sourceKind === 'http_json') {
        config = {
          url: httpUrl,
          method: httpMethod,
          headers: headers ? JSON.parse(headers) : undefined,
          body: body || undefined,
          jsonPath,
          maxItems,
        }
      } else if (sourceKind === 'web_scraper') {
        config = {
          url: webUrl,
          extractMode,
          maxItems: webMaxItems,
          selectors: {
            container: containerSelector || undefined,
            title: titleSelector || undefined,
            summary: summarySelector || undefined,
            content: contentSelector || undefined,
            author: authorSelector || undefined,
            publishedAt: dateSelector || undefined,
            links: linksSelector || undefined,
          },
        }
      }

      // Build normalization
      const normalization: any = {}
      if (idPath) normalization.idPath = idPath
      if (titlePath) normalization.titlePath = titlePath
      if (summaryPath) normalization.summaryPath = summaryPath
      if (urlPath) normalization.urlPath = urlPath
      if (publishedAtPath) normalization.publishedAtPath = publishedAtPath
      if (authorPath) normalization.authorPath = authorPath

      const { data, error } = await supabase
        .from('user_sources')
        .insert({
          owner_user_id: user?.id || null,
          name,
          description: description || null,
          kind: sourceKind,
          config_jsonb: config,
          normalization_jsonb: Object.keys(normalization).length > 0 ? normalization : null,
          visibility,
        })
        .select()
        .single()

      if (error) throw error

      setSuccess('Source created successfully!')
      resetForm()
      await loadSources()
    } catch (err: any) {
      setError(`Failed to create source: ${err.message}`)
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
    setFeedUrl('')
    setHttpUrl('')
    setHeaders('')
    setBody('')
    setJsonPath('$')
    setMaxItems(10)
    setWebUrl('')
    setExtractMode('single')
    setContainerSelector('')
    setTitleSelector('')
    setSummarySelector('')
    setContentSelector('')
    setAuthorSelector('')
    setDateSelector('')
    setLinksSelector('')
    setWebMaxItems(1)
    setIdPath('')
    setTitlePath('')
    setSummaryPath('')
    setUrlPath('')
    setPublishedAtPath('')
    setAuthorPath('')
    setShowForm(false)
  }

  async function handleDeleteSource(id: string) {
    if (!confirm('Delete this source?')) return

    try {
      const { error } = await supabase
        .from('user_sources')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadSources()
      setSuccess('Source deleted')
    } catch (err: any) {
      setError(`Failed to delete: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">User Sources Manager</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            {showForm ? 'Cancel' : '+ New Source'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-900/50 border border-green-600 rounded">
            {success}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="mb-8 p-6 bg-gray-900 border border-gray-700 rounded">
            <h2 className="text-xl font-bold mb-4">Create New Source</h2>

            <form onSubmit={handleCreateSource} className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Source Type</label>
                  <select
                    value={sourceKind}
                    onChange={(e) => setSourceKind(e.target.value as SourceKind)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="rss">RSS Feed</option>
                    <option value="http_json">HTTP JSON API</option>
                    <option value="web_scraper">Web Scraper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  >
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              {/* RSS Config */}
              {sourceKind === 'rss' && (
                <div className="space-y-4 p-4 bg-gray-800/50 border border-gray-700 rounded">
                  <h3 className="font-medium">RSS Configuration</h3>

                  <div>
                    <label className="block text-sm font-medium mb-1">Feed URL</label>
                    <input
                      type="url"
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Max Items</label>
                    <input
                      type="number"
                      value={maxItems}
                      onChange={(e) => setMaxItems(parseInt(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {/* HTTP JSON Config */}
              {sourceKind === 'http_json' && (
                <div className="space-y-4 p-4 bg-gray-800/50 border border-gray-700 rounded">
                  <h3 className="font-medium">HTTP JSON Configuration</h3>

                  <div>
                    <label className="block text-sm font-medium mb-1">API URL</label>
                    <input
                      type="url"
                      value={httpUrl}
                      onChange={(e) => setHttpUrl(e.target.value)}
                      placeholder="https://api.example.com/items"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Method</label>
                      <select
                        value={httpMethod}
                        onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'POST')}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Max Items</label>
                      <input
                        type="number"
                        value={maxItems}
                        onChange={(e) => setMaxItems(parseInt(e.target.value))}
                        min="1"
                        max="100"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      JSONPath to Items Array
                      <span className="text-xs text-gray-400 ml-2">(e.g., $.data.items or $.results)</span>
                    </label>
                    <input
                      type="text"
                      value={jsonPath}
                      onChange={(e) => setJsonPath(e.target.value)}
                      placeholder="$.data"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Headers (JSON)
                      <span className="text-xs text-gray-400 ml-2">(optional)</span>
                    </label>
                    <textarea
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      placeholder='{"Authorization": "Bearer token"}'
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 font-mono text-sm"
                      rows={2}
                    />
                  </div>

                  {httpMethod === 'POST' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Request Body (JSON)
                      </label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder='{"query": "..."}'
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 font-mono text-sm"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Web Scraper Config */}
              {sourceKind === 'web_scraper' && (
                <div className="space-y-4 p-4 bg-gray-800/50 border border-gray-700 rounded">
                  <h3 className="font-medium">Web Scraper Configuration</h3>

                  <div>
                    <label className="block text-sm font-medium mb-1">Web Page URL</label>
                    <input
                      type="url"
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      placeholder="https://example.com/page"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Extract Mode</label>
                      <select
                        value={extractMode}
                        onChange={(e) => setExtractMode(e.target.value as 'single' | 'list')}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="single">Single Item</option>
                        <option value="list">List of Items</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Max Items</label>
                      <input
                        type="number"
                        value={webMaxItems}
                        onChange={(e) => setWebMaxItems(parseInt(e.target.value))}
                        min="1"
                        max="100"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-300">
                    <strong>CSS Selectors:</strong> Use standard CSS selectors to extract content.
                    <br />
                    Examples: <code className="bg-gray-800 px-1 py-0.5 rounded">article</code>,
                    <code className="bg-gray-800 px-1 py-0.5 rounded ml-1">.post-title</code>,
                    <code className="bg-gray-800 px-1 py-0.5 rounded ml-1">#content</code>,
                    <code className="bg-gray-800 px-1 py-0.5 rounded ml-1">a[href]</code>
                  </div>

                  {extractMode === 'list' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Container Selector
                        <span className="text-xs text-gray-400 ml-2">(required for list mode)</span>
                      </label>
                      <input
                        type="text"
                        value={containerSelector}
                        onChange={(e) => setContainerSelector(e.target.value)}
                        placeholder="article, .post, .item"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                        required={extractMode === 'list'}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Selector for each item container (e.g., "article", ".post-item")
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Title Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={titleSelector}
                        onChange={(e) => setTitleSelector(e.target.value)}
                        placeholder="h1, .title, .post-title"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Summary Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={summarySelector}
                        onChange={(e) => setSummarySelector(e.target.value)}
                        placeholder=".summary, .excerpt, p"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Content Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={contentSelector}
                        onChange={(e) => setContentSelector(e.target.value)}
                        placeholder=".content, article, .post-body"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Author Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={authorSelector}
                        onChange={(e) => setAuthorSelector(e.target.value)}
                        placeholder=".author, .byline, [rel=author]"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={dateSelector}
                        onChange={(e) => setDateSelector(e.target.value)}
                        placeholder=".date, time, .published"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Links Selector
                        <span className="text-xs text-gray-400 ml-2">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={linksSelector}
                        onChange={(e) => setLinksSelector(e.target.value)}
                        placeholder="a, a[href], .link"
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Normalization Config */}
              <div className="space-y-4 p-4 bg-gray-800/50 border border-gray-700 rounded">
                <h3 className="font-medium">
                  Field Normalization
                  <span className="text-xs text-gray-400 ml-2">(optional - for JSON sources)</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ID Path</label>
                    <input
                      type="text"
                      value={idPath}
                      onChange={(e) => setIdPath(e.target.value)}
                      placeholder="$.id"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title Path</label>
                    <input
                      type="text"
                      value={titlePath}
                      onChange={(e) => setTitlePath(e.target.value)}
                      placeholder="$.title"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Summary Path</label>
                    <input
                      type="text"
                      value={summaryPath}
                      onChange={(e) => setSummaryPath(e.target.value)}
                      placeholder="$.description"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">URL Path</label>
                    <input
                      type="text"
                      value={urlPath}
                      onChange={(e) => setUrlPath(e.target.value)}
                      placeholder="$.link"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Published At Path</label>
                    <input
                      type="text"
                      value={publishedAtPath}
                      onChange={(e) => setPublishedAtPath(e.target.value)}
                      placeholder="$.pubDate"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Author Path</label>
                    <input
                      type="text"
                      value={authorPath}
                      onChange={(e) => setAuthorPath(e.target.value)}
                      placeholder="$.author"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Create Source
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sources List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Your Sources ({sources.length})</h2>

          {sources.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-gray-900 border border-gray-700 rounded">
              No sources yet. Create your first source!
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 bg-gray-900 border border-gray-700 rounded"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{source.name}</h3>
                        <span className="px-2 py-1 text-xs bg-blue-900/50 border border-blue-600 rounded">
                          {source.kind}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-700 rounded">
                          {source.visibility}
                        </span>
                      </div>

                      {source.description && (
                        <p className="text-sm text-gray-400 mb-2">{source.description}</p>
                      )}

                      <div className="text-xs text-gray-500 space-y-1">
                        <div>ID: {source.id}</div>
                        <div>Created: {new Date(source.created_at).toLocaleString()}</div>
                        {source.last_fetched_at && (
                          <div>Last fetched: {new Date(source.last_fetched_at).toLocaleString()}</div>
                        )}
                        <div>Fetch count: {source.fetch_count}</div>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-400 hover:underline">
                          View Config
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(
                            {
                              config: source.config_jsonb,
                              normalization: source.normalization_jsonb,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </div>

                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="ml-4 px-3 py-1 text-sm bg-red-900/50 hover:bg-red-800 border border-red-600 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
