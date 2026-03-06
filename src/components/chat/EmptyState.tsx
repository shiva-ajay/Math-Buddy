import { Sparkles, BookOpen, Code2, BrainCircuit, ArrowRight } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

const suggestions = [
  {
    icon: BookOpen,
    accent: 'from-blue-500/15 to-blue-600/5',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    label: 'Explain a concept',
    prompt: 'Explain Ratio & Proportion with shortcut methods for MAT exam',
  },
  {
    icon: Code2,
    accent: 'from-emerald-500/15 to-emerald-600/5',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    label: 'Solve a problem',
    prompt: 'A train 200m long crosses a bridge 300m long in 25 seconds. Find the speed of the train.',
  },
  {
    icon: BrainCircuit,
    accent: 'from-violet-500/15 to-violet-600/5',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    label: 'Quick quiz',
    prompt: 'Prepare a 10 question MAT mock test mixing Quant, Reasoning and Verbal',
  },
]

export function EmptyState() {
  const sendMessage = useChatStore((s) => s.sendMessage)
  const model = useSettingsStore((s) => s.model)
  const systemPrompt = useSettingsStore((s) => s.systemPrompt)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
      {/* Hero icon */}
      <div className="relative mb-8">
        <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-linear-to-br from-accent/25 via-accent/10 to-transparent flex items-center justify-center border border-accent/15">
          <Sparkles size={28} className="text-accent" />
        </div>
        <div className="absolute -inset-10 bg-accent/[0.03] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Title */}
      <h1
        className="text-4xl font-bold tracking-tight mb-3"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="text-text-primary">Mohana </span>
        <span className="text-accent italic">GPT</span>
      </h1>

      <p className="text-text-secondary text-[0.9375rem] max-w-md text-center mb-14 leading-relaxed">
        Your personal MAT exam tutor. Master Quant, Reasoning, Verbal & Data Analysis — ace your MBA entrance!
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[46rem] w-full">
        {suggestions.map((s, i) => (
          <button
            key={s.label}
            onClick={() => sendMessage(s.prompt, model, systemPrompt)}
            className="group relative text-left px-6 py-5 rounded-2xl bg-surface-2/60 border border-border-subtle hover:border-border transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-black/15 hover:-translate-y-0.5 min-h-[11.25rem]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Hover gradient */}
            <div className={`absolute inset-0 bg-linear-to-br ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="relative flex h-full flex-col">
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
                <s.icon size={18} className={s.iconColor} />
              </div>

              <div className="space-y-2">
                <p className="text-[0.9rem] font-semibold text-text-primary tracking-tight leading-snug">
                  {s.label}
                </p>
                <p className="text-[0.82rem] text-text-tertiary leading-relaxed line-clamp-3">
                  {s.prompt}
                </p>
              </div>

              <div className="mt-auto pt-4 flex items-center gap-1.5 text-[0.72rem] font-medium text-text-quaternary group-hover:text-accent transition-colors duration-200">
                <span>Try this</span>
                <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
