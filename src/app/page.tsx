'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as Diff from 'diff'

const DEFAULT_USER_ID = 'c04f87b1-2c69-4e97-a971-50d6524ca8a2'

// --- CODE SYNTAX RENDERER ---
// Highlights common prompt keywords, variables, and patterns
const renderSyntaxHighlighted = (text: string) => {
  const lines = text.split('\n')
  return (
    <pre style={{ fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace", margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      <code>
        {lines.map((line, lineIdx) => (
          <div key={lineIdx} className="code-line flex">
            <span className="line-number select-none text-right pr-4 min-w-[3rem] text-slate-300 border-r border-slate-200 mr-4 shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {lineIdx + 1}
            </span>
            <span className="line-content flex-1">
              <SyntaxLine text={line} />
            </span>
          </div>
        ))}
      </code>
    </pre>
  )
}

// Plain text line renderer — no syntax coloring
const SyntaxLine = ({ text }: { text: string }) => {
  if (!text) return <span>&nbsp;</span>
  return <span className="text-slate-700">{text}</span>
}

// Styled wrapper for the code block
const CodeBlock = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg overflow-hidden border border-slate-200 shadow-sm ${className}`}>
    <div className="bg-white p-4 font-mono text-sm leading-relaxed overflow-x-auto">
      {children}
    </div>
  </div>
)

export default function PromptLibrary() {
  // --- AUTH STATE ---
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [username, setUsername] = useState('Local User')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // --- DATA STATE ---
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('') 
  const [promptsList, setPromptsList] = useState<any[]>([])
  const [tagsStats, setTagsStats] = useState<Record<string, number>>({}) 
  const [debugMsg, setDebugMsg] = useState('')

  // --- FILTER & PAGINATION STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL') 
  const [sortOrder, setSortOrder] = useState('NEWEST') 
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // --- BULK ACTION STATE ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkTags, setBulkTags] = useState('')

  // --- SHARED VIEW STATE ---
  const [sharedPromptId, setSharedPromptId] = useState<string | null>(null)

  // --- EDITOR STATE ---
  const [title, setTitle] = useState('')
  const [tagsInput, setTagsInput] = useState('') 
  const [promptContent, setPromptContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // --- INTERACTIVE STATE ---
  const [activeVersions, setActiveVersions] = useState<Record<string, any>>({})
  const [editMode, setEditMode] = useState<Record<string, string | null>>({})
  const [tempEditValue, setTempEditValue] = useState('')
  const [diffMode, setDiffMode] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shareId = params.get('share_id')
    if (shareId) setSharedPromptId(shareId)

    fetchCategories()
    fetchPrompts()
  }, [userId])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter, sortOrder])

  // --- FETCHING ---
  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true })
    if (data && data.length > 0) {
      setCategories(data)
      if (!selectedCategory) setSelectedCategory(data[0].id)
    }
  }

  const fetchPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select(`
        id, title, created_at, tags, category_id,
        categories ( id, name ),
        prompt_versions ( id, content, version_number, created_at, label ),
        favorites ( user_id )
      `)
      .order('created_at', { ascending: false })

    if (error) setDebugMsg(`Fetch Error: ${error.message}`)
    else {
      const processed = data?.map(p => ({
        ...p,
        is_favorite: p.favorites?.some((f:any) => f.user_id === userId),
        prompt_versions: p.prompt_versions.sort((a: any, b: any) => b.version_number - a.version_number)
      })) || []
      setPromptsList(processed)

      const stats: Record<string, number> = {}
      processed.forEach(p => {
        p.tags?.forEach((t: string) => {
          const cleanTag = t.trim().toLowerCase()
          if(cleanTag) stats[cleanTag] = (stats[cleanTag] || 0) + 1
        })
      })
      setTagsStats(stats)
    }
  }

  // --- ACTIONS ---
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
      
      if (error) throw error

      if (data) {
        setCategories(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)))
        setNewCategoryName('')
      }
    } catch (error: any) {
      alert(`Error creating category: ${error.message}`)
    }
  }

  const handleSave = async () => {
    if (!title || !promptContent) return alert("Title and Prompt are required")
    if (!selectedCategory) return alert("Select a category")

    try {
      const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0)

      const { data: pData, error: pError } = await supabase
        .from('prompts')
        .insert([{ 
          title: title, user_id: userId, category_id: selectedCategory, tags: tagsArray
        }]).select()

      if (pError) throw pError

      const { error: vError } = await supabase
        .from('prompt_versions')
        .insert([{ 
          prompt_id: pData[0].id, content: promptContent, version_number: 1 
        }])

      if (vError) throw vError

      setTitle(''); setPromptContent(''); setTagsInput('')
      fetchPrompts()
      alert("Prompt Created!")
    } catch (error: any) {
      alert(`Save Failed: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) return
    
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', id)
      if (error) throw error
      
      setPromptsList(prev => prev.filter(p => p.id !== id))
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds)
        newSet.delete(id)
        setSelectedIds(newSet)
      }
    } catch (error: any) {
      alert(`Delete Failed: ${error.message}`)
    }
  }

  const handleUpdateGeneric = async (table: string, id: string, field: string, value: any, promptId: string) => {
    const { error } = await supabase.from(table).update({ [field]: value }).eq('id', id)
    if (!error) {
      setEditMode({ ...editMode, [promptId]: null })
      fetchPrompts()
    } else {
      alert(error.message)
    }
  }

  const handleUpdateTags = async (promptId: string, tagsString: string) => {
    const tagsArray = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
    handleUpdateGeneric('prompts', promptId, 'tags', tagsArray, promptId)
  }

  const saveNewVersion = async (promptId: string, lastVer: number, content: string) => {
    const { error } = await supabase.from('prompt_versions').insert([{
      prompt_id: promptId, content: content, version_number: lastVer + 1, label: 'New Draft'
    }])
    if (!error) {
      setEditMode({ ...editMode, [promptId]: null })
      fetchPrompts()
    } else alert(error.message)
  }

  const toggleFavorite = async (promptId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await supabase.from('favorites').delete().match({ prompt_id: promptId, user_id: userId })
      } else {
        await supabase.from('favorites').insert([{ prompt_id: promptId, user_id: userId }])
      }
      fetchPrompts()
    } catch (error: any) {
      alert(`Favorite Error: ${error.message}`)
    }
  }

  const handleShare = (promptId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?share_id=${promptId}`
    navigator.clipboard.writeText(url)
    alert(`Link copied to clipboard!\n\n${url}\n\nSend this to a friend (if deployed) or open in a new tab to see the Read-Only view.`)
  }

  // --- BULK ACTIONS LOGIC ---
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === displayPrompts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayPrompts.map(p => p.id)))
    }
  }

  const executeBulkMove = async () => {
    if (!bulkCategory) return alert("Please select a category to move to.")
    if (!confirm(`Move ${selectedIds.size} items to selected category?`)) return
    
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('prompts').update({ category_id: bulkCategory }).in('id', ids)
    
    if (error) alert(error.message)
    else {
      alert("Moved successfully")
      fetchPrompts()
      setSelectedIds(new Set())
    }
  }

  const executeBulkTag = async () => {
    if (!bulkTags) return alert("Please enter tags to add.")
    const newTags = bulkTags.split(',').map(t => t.trim()).filter(Boolean)
    if (newTags.length === 0) return

    if (!confirm(`Add tags "${newTags.join(', ')}" to ${selectedIds.size} items?`)) return

    const ids = Array.from(selectedIds)
    const { data: items } = await supabase.from('prompts').select('id, tags').in('id', ids)

    if (items) {
      for (const item of items) {
        const existing = item.tags || []
        const combined = Array.from(new Set([...existing, ...newTags]))
        await supabase.from('prompts').update({ tags: combined }).eq('id', item.id)
      }
      alert("Tags added!")
      fetchPrompts()
      setSelectedIds(new Set())
      setBulkTags('')
    }
  }

  const executeBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} prompts? This cannot be undone.`)) return

    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase.from('prompts').delete().in('id', ids)
      
      if (error) throw error

      setPromptsList(prev => prev.filter(p => !selectedIds.has(p.id)))
      setSelectedIds(new Set())
      alert("Prompts deleted successfully.")
    } catch (error: any) {
      alert(`Bulk Delete Failed: ${error.message}`)
    }
  }


  // --- HELPERS ---
  const renderDiff = (currentVer: any, allVersions: any[]) => {
    const prevVer = allVersions.find((v:any) => v.version_number === currentVer.version_number - 1)
    if (!prevVer) return <div className="text-slate-400 italic font-mono text-sm p-2">// No previous version to compare.</div>
    const diff = Diff.diffWords(prevVer.content, currentVer.content)
    return (
      <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
        {diff.map((part, i) => (
          <span key={i} className={
            part.added 
              ? 'bg-green-100 text-green-800 rounded px-0.5' 
              : part.removed 
              ? 'bg-red-100 text-red-600 line-through rounded px-0.5' 
              : 'text-slate-700'
          }>{part.value}</span>
        ))}
      </div>
    )
  }

  const getActiveVersion = (p: any) => activeVersions[p.id] || p.prompt_versions[0] || { content: "No content", version_number: 0 }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).length
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // --- FILTER & PAGINATION LOGIC ---
  let displayPrompts = promptsList

  if (sharedPromptId) {
    displayPrompts = promptsList.filter(p => p.id === sharedPromptId)
  } else {
    displayPrompts = promptsList.filter(p => {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = p.title.toLowerCase().includes(searchLower) || 
                            p.tags?.some((t:string) => t.toLowerCase().includes(searchLower)) ||
                            p.prompt_versions[0]?.content.toLowerCase().includes(searchLower)
      
      let matchesFilter = true
      if (activeFilter === 'FAVORITES') matchesFilter = p.is_favorite
      else if (activeFilter.startsWith('TAG:')) matchesFilter = p.tags?.some((t:string) => t.toLowerCase() === activeFilter.replace('TAG:', ''))
      else if (activeFilter !== 'ALL') matchesFilter = p.category_id === activeFilter

      return matchesSearch && matchesFilter
    })
  }

  displayPrompts.sort((a, b) => {
    if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortOrder === 'OLDEST') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortOrder === 'AZ') return a.title.localeCompare(b.title)
    return 0
  })

  const totalItems = displayPrompts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedPrompts = displayPrompts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  )

  // --- RENDER SHARED/READ-ONLY VIEW ---
  if (sharedPromptId && displayPrompts.length > 0) {
    const p = displayPrompts[0]
    const currentVer = getActiveVersion(p)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-2xl w-full rounded-xl shadow-xl overflow-hidden border border-slate-200">
           <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b border-slate-200">
             <div>
               <h1 className="text-2xl font-bold text-white">{p.title}</h1>
               <div className="flex gap-2 mt-2">
                 <span className="bg-slate-700 text-xs px-2 py-1 rounded uppercase text-slate-300">{p.categories?.name}</span>
                 {p.tags?.map((t:string) => <span key={t} className="text-amber-400 text-xs font-mono">#{t}</span>)}
               </div>
             </div>
             <a href="/" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded transition text-slate-300">Back to Library</a>
           </div>
      <div className="p-6 bg-white">
             <div className="relative group">
               <CodeBlock>
                 {renderSyntaxHighlighted(currentVer.content)}
               </CodeBlock>
               <button 
                 onClick={() => { navigator.clipboard.writeText(currentVer.content); alert("Copied to clipboard!") }}
                 className="absolute top-10 right-3 bg-slate-700 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 text-xs px-3 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
               >
                 Copy
               </button>
             </div>
             <div className="mt-4 flex justify-between text-slate-500 text-xs border-t border-slate-800 pt-4 font-mono">
               <span>{getWordCount(currentVer.content)} words</span>
               <span>Updated {formatDate(currentVer.created_at)}</span>
             </div>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 pb-20"> 
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full shadow-xl z-10 overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg shadow-indigo-500/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Prompt Library</h1>
          </div>
          <p className="text-xs text-slate-500 pl-11">v3.4 Syntax Highlighting</p>
        </div>

        {/* SEARCH BAR */}
        <div className="px-4 my-6">
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
            <input 
              className="w-full bg-slate-800 text-sm text-white pl-9 pr-3 py-2 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none border border-slate-700 placeholder-slate-500 transition-all focus:border-blue-500"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-2 space-y-1">
          <button onClick={() => setActiveFilter('ALL')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}>
            🏠 Home
          </button>
          <button onClick={() => setActiveFilter('FAVORITES')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === 'FAVORITES' ? 'bg-pink-600 text-white' : 'hover:bg-slate-800'}`}>
            ❤️ My Favorites
          </button>

          <div className="mt-8 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</div>
          
          <div className="px-4 mb-3">
             <div className="flex items-center gap-1">
               <input 
                 className="w-full bg-slate-800 text-xs text-white px-2 py-1.5 rounded border border-slate-700 focus:border-indigo-500 outline-none placeholder-slate-500 transition-colors"
                 placeholder="+ New Category"
                 value={newCategoryName}
                 onChange={(e) => setNewCategoryName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
               />
               <button 
                 onClick={handleAddCategory}
                 disabled={!newCategoryName.trim()}
                 className="text-slate-400 hover:text-green-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </button>
             </div>
          </div>
          
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveFilter(c.id)} className={`w-full text-left px-4 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeFilter === c.id ? 'bg-slate-800 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${activeFilter === c.id ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
              {c.name}
            </button>
          ))}

          <div className="mt-8 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trending Tags</div>
          <div className="px-4 flex flex-wrap gap-2">
            {Object.entries(tagsStats)
              .sort(([,a], [,b]) => b - a) 
              .slice(0, 10) 
              .map(([tag, count]) => (
                <button key={tag} onClick={() => setActiveFilter(`TAG:${tag}`)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${activeFilter === `TAG:${tag}` ? 'bg-indigo-500 text-white border-indigo-500' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}`} title={`${count} prompts`}>
                  {tag}
                </button>
            ))}
            {Object.keys(tagsStats).length === 0 && <span className="text-xs text-slate-600 italic">No tags yet</span>}
          </div>
        </nav>

        {/* USER PROFILE */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {username.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{username}</p>
              <button onClick={() => setIsLoginModalOpen(true)} className="text-xs text-blue-400 hover:text-blue-300">Switch User</button>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 ml-64 p-8 transition-all">
        
        {/* LOGIN MODAL */}
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
              <h2 className="text-lg font-bold mb-4">Login / Switch User</h2>
              <input className="w-full border p-2 rounded mb-2" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
              <input className="w-full border p-2 rounded mb-4 text-xs font-mono" placeholder="User UUID" value={userId} onChange={e => setUserId(e.target.value)} />
              <button onClick={() => setIsLoginModalOpen(false)} className="bg-blue-600 text-white px-4 py-2 rounded w-full">Done</button>
            </div>
          </div>
        )}

        {/* CREATE PROMPT WIDGET */}
        {activeFilter === 'ALL' && !searchQuery && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 transition-all hover:shadow-md group">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">✨ Create New Prompt</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <input className="border p-2 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Title..." value={title} onChange={e => setTitle(e.target.value)} />
              <select className="border p-2 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <input className="w-full border p-2 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-3 text-sm" placeholder="Tags (e.g. coding, seo) - comma separated" value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
            <textarea className="w-full border p-2 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-40 mb-3 text-sm font-mono" placeholder="Prompt content..." value={promptContent} onChange={e => setPromptContent(e.target.value)} />
            <button onClick={handleSave} className="bg-slate-900 text-white w-full py-2 rounded font-bold hover:bg-black transition-colors">Create Prompt</button>
          </div>
        )}

        {/* RESULTS HEADER */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {activeFilter === 'ALL' ? 'Library' : activeFilter === 'FAVORITES' ? '❤️ My Favorites' : activeFilter.startsWith('TAG:') ? `# ${activeFilter.replace('TAG:', '')}` : 'Category View'}
              {searchQuery && <span className="text-lg font-normal text-slate-400">results for "{searchQuery}"</span>}
            </h2>
            <div className="flex items-center gap-4 mt-1">
               <p className="text-slate-500 text-sm">Showing {paginatedPrompts.length} of {totalItems} prompts</p>
               <button 
                  onClick={toggleSelectAll} 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
               >
                  {selectedIds.size === displayPrompts.length && displayPrompts.length > 0 ? 'Deselect All' : 'Select All on Page'}
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-400 uppercase">Sort by:</span>
             <select 
               className="text-sm border border-slate-300 rounded-lg p-1.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
               value={sortOrder}
               onChange={(e) => setSortOrder(e.target.value)}
             >
               <option value="NEWEST">Newest First</option>
               <option value="OLDEST">Oldest First</option>
               <option value="AZ">Title (A-Z)</option>
             </select>
          </div>
        </div>

        {/* PROMPTS LIST */}
        <div className="grid gap-6">
          {paginatedPrompts.map((p) => {
            const currentVer = getActiveVersion(p)
            const isSelected = selectedIds.has(p.id)
            
            const isEditingTitle = editMode[p.id] === 'TITLE'
            const isEditingCategory = editMode[p.id] === 'CATEGORY'
            const isEditingTags = editMode[p.id] === 'TAGS'
            const isEditingVerLabel = editMode[p.id] === 'VERSION_LABEL'
            const isEditingContent = editMode[p.id] === 'CONTENT'
            const isCreatingVersion = editMode[p.id] === 'NEW_VERSION_DRAFT'
            const showDiff = diffMode[p.id]

            return (
              <div 
                key={p.id} 
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/10' : p.is_favorite ? 'border-pink-200 shadow-pink-50' : 'border-slate-200'}`}
              >
                
                {/* 1. HEADER */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start relative">
                  
                  <div className="absolute top-5 left-3">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                       checked={isSelected}
                       onChange={() => toggleSelection(p.id)}
                     />
                  </div>

                  <div className="space-y-1 flex-1 ml-6">
                    {/* TITLE */}
                    {isEditingTitle ? (
                      <div className="flex gap-2 mb-2 w-full pr-4">
                        <input className="flex-1 text-xl font-bold p-1 border border-blue-300 rounded bg-white" value={tempEditValue} onChange={e => setTempEditValue(e.target.value)} autoFocus />
                        <button onClick={() => handleUpdateGeneric('prompts', p.id, 'title', tempEditValue, p.id)} className="text-green-600 font-bold px-2">✓</button>
                        <button onClick={() => setEditMode({...editMode, [p.id]: null})} className="text-red-500 px-2">✕</button>
                      </div>
                    ) : (
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 group">
                        {p.title} 
                        <span onClick={() => { setTempEditValue(p.title); setEditMode({...editMode, [p.id]: 'TITLE'}) }} className="opacity-0 group-hover:opacity-100 text-slate-400 text-xs cursor-pointer hover:text-blue-500">✎</span>
                      </h3>
                    )}
                    
                    {/* TAGS & CAT */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {isEditingCategory ? (
                        <select className="border rounded p-1" defaultValue={p.category_id} onChange={(e) => handleUpdateGeneric('prompts', p.id, 'category_id', e.target.value, p.id)} onBlur={() => setEditMode({...editMode, [p.id]: null})}>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span onClick={() => setEditMode({...editMode, [p.id]: 'CATEGORY'})} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold uppercase cursor-pointer hover:bg-blue-100">{p.categories?.name}</span>
                      )}

                      {isEditingTags ? (
                        <div className="flex items-center gap-1">
                          <input className="border rounded p-1 w-40 text-xs" value={tempEditValue} onChange={e => setTempEditValue(e.target.value)} autoFocus placeholder="Separate by comma" />
                          <button onClick={() => handleUpdateTags(p.id, tempEditValue)} className="text-green-600">✓</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded" onClick={() => { setTempEditValue(p.tags?.join(', ')); setEditMode({...editMode, [p.id]: 'TAGS'}) }}>
                          {p.tags?.length ? p.tags.map((tag:string, i:number) => <span key={i} className="text-blue-600 font-mono">#{tag}</span>) : <span className="text-slate-400 italic">No tags</span>}
                          <span className="text-slate-300">✎</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleShare(p.id)} className="text-slate-300 hover:text-blue-500 transition-colors" title="Share">🔗</button>
                    <button onClick={() => toggleFavorite(p.id, p.is_favorite)} className={`text-2xl transition-transform hover:scale-110 active:scale-95 ${p.is_favorite ? 'text-pink-500' : 'text-slate-200 hover:text-pink-200'}`} title={p.is_favorite ? "Remove from Favorites" : "Add to Favorites"}>
                      {p.is_favorite ? '♥' : '♡'}
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>

                {/* 2. TOOLBAR */}
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                   <div className="flex items-center gap-2">
                      <select 
                        className="p-1 rounded border border-slate-300 bg-white text-slate-700 text-xs" 
                        value={currentVer.id} 
                        onChange={(e) => { const selected = p.prompt_versions.find((v:any) => v.id === e.target.value); setActiveVersions({...activeVersions, [p.id]: selected}) }}
                      >
                        {p.prompt_versions.map((v:any) => (
                          <option key={v.id} value={v.id}>v{v.version_number} {v.label ? `- ${v.label}` : ''}</option>
                        ))}
                      </select>
                      {isEditingVerLabel ? (
                         <div className="flex items-center gap-1">
                           <input className="p-1 border border-slate-300 bg-white text-slate-700 rounded w-24 text-xs" value={tempEditValue} onChange={e => setTempEditValue(e.target.value)} autoFocus />
                           <button onClick={() => handleUpdateGeneric('prompt_versions', currentVer.id, 'label', tempEditValue, p.id)} className="text-green-600 font-bold">✓</button>
                         </div>
                      ) : (
                        <span onClick={() => { setTempEditValue(currentVer.label || ''); setEditMode({...editMode, [p.id]: 'VERSION_LABEL'}) }} className="text-slate-400 cursor-pointer hover:text-blue-500 decoration-dotted underline font-mono text-xs">
                          {currentVer.label || 'label...'}
                        </span>
                      )}
                   </div>
                   <button 
                     onClick={() => setDiffMode({...diffMode, [p.id]: !showDiff})} 
                     className={`font-bold px-2 py-0.5 rounded font-mono text-xs ${showDiff ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'}`}
                   >
                     {showDiff ? '≠ Hide Diff' : '≠ Diff'}
                   </button>
                </div>

                {/* 3. CONTENT — CODE BLOCK STYLE */}
                <div className="bg-white p-0">
                  {isEditingContent || isCreatingVersion ? (
                    <div className="space-y-3 p-4 bg-white">
                      {isCreatingVersion && (
                        <div className="bg-blue-900/40 border border-blue-700 text-blue-300 px-3 py-1 text-xs font-mono rounded inline-block">
                          // drafting v{p.prompt_versions[0].version_number + 1}
                        </div>
                      )}
                      <textarea 
                        className="w-full h-56 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 font-mono text-sm shadow-inner outline-none leading-relaxed resize-y" 
                        value={tempEditValue} 
                        onChange={(e) => setTempEditValue(e.target.value)} 
                        autoFocus 
                      />
                      <div className="flex gap-2 justify-end pb-2">
                        <button onClick={() => setEditMode({...editMode, [p.id]: null})} className="text-sm px-4 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded font-mono">cancel</button>
                        {isCreatingVersion ? (
                           <button onClick={() => saveNewVersion(p.id, p.prompt_versions[0].version_number, tempEditValue)} className="text-sm px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded font-mono">Save as New Version</button>
                        ) : (
                           <button onClick={() => handleUpdateGeneric('prompt_versions', currentVer.id, 'content', tempEditValue, p.id)} className="text-sm px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded font-mono">Save Changes</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      {/* Code chrome bar */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <span className="text-slate-400 text-xs font-mono">prompt</span>
                        {/* Copy button in chrome bar */}
                        <button 
                          onClick={() => { navigator.clipboard.writeText(currentVer.content); alert("Copied!") }} 
                          className="ml-auto text-slate-400 hover:text-slate-700 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          title="Copy to Clipboard"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          copy
                        </button>
                      </div>

                      {/* Code content */}
                      <div className="bg-white p-4 text-sm leading-relaxed overflow-x-auto min-h-[4rem] max-h-96 overflow-y-auto">
                        {showDiff 
                          ? renderDiff(currentVer, p.prompt_versions) 
                          : renderSyntaxHighlighted(currentVer.content)
                        }
                      </div>

                      {/* Edit actions bar at bottom */}
                      {!showDiff && (
                        <div className="flex gap-4 px-4 py-2 bg-slate-50 border-t border-slate-200">
                          <button 
                            onClick={() => { setTempEditValue(currentVer.content); setEditMode({...editMode, [p.id]: 'CONTENT'}) }} 
                            className="text-xs font-mono text-slate-500 hover:text-slate-200 flex items-center gap-1 transition-colors"
                          >
                            ✏️ edit
                          </button>
                          <button 
                            onClick={() => { setTempEditValue(currentVer.content); setEditMode({...editMode, [p.id]: 'NEW_VERSION_DRAFT'}) }} 
                            className="text-xs font-mono text-indigo-400 hover:text-indigo-200 flex items-center gap-1 transition-colors"
                          >
                            ✨ Save as New Version
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. METADATA FOOTER */}
                <div className="flex justify-between items-center px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  <span>{getWordCount(currentVer.content)} words</span>
                  <span>updated: {formatDate(currentVer.created_at)}</span>
                </div>

              </div>
            )
          })}
          {displayPrompts.length === 0 && (
            <div className="text-center text-slate-400 py-10 font-mono">
              <div className="text-slate-600 text-sm">// No prompts found matching your criteria.</div>
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalItems > 0 && (
          <div className="mt-8 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-2 text-sm text-slate-500">
               <span>Show</span>
               <select className="border rounded p-1 bg-slate-50" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
               </select>
               <span>per page</span>
             </div>
             
             <div className="flex gap-2">
               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
               <span className="px-3 py-1 text-slate-600 text-sm flex items-center font-mono">Page {currentPage} of {totalPages}</span>
               <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
             </div>
          </div>
        )}

        {/* FLOATING BULK ACTIONS BAR */}
        {selectedIds.size > 0 && (
           <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
             <div className="font-bold text-sm whitespace-nowrap font-mono">
               {selectedIds.size} selected
             </div>
             <div className="h-6 w-px bg-slate-700"></div>
             
             <div className="flex items-center gap-2">
                <select 
                  className="bg-slate-800 text-xs p-2 rounded border border-slate-700"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                >
                  <option value="">Move to Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={executeBulkMove} className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-2 rounded font-bold">Move</button>
             </div>

             <div className="h-6 w-px bg-slate-700"></div>

             <div className="flex items-center gap-2">
                <input 
                  className="bg-slate-800 text-xs p-2 rounded border border-slate-700 w-32"
                  placeholder="Add Tags (comma sep)"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                />
                <button onClick={executeBulkTag} className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-2 rounded font-bold">Tag</button>
             </div>

             <div className="h-6 w-px bg-slate-700"></div>

             <button onClick={executeBulkDelete} className="bg-red-600 hover:bg-red-500 text-xs px-3 py-2 rounded font-bold flex items-center gap-2">
               <span>Trash</span>
             </button>

             <div className="h-6 w-px bg-slate-700"></div>

             <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-white">Cancel</button>
           </div>
        )}

      </main>
    </div>
  )
}