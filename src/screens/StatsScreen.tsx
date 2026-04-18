import { useApp } from '../context/AppContext'
import {
  getGoodDayStreak,
  getAverageCycleBetweenBadDays,
  getEpisodesThisMonth,
  getLastEpisodes,
  getWeeklyEpisodeCounts,
  getEntryStatus,
  statusColor,
  statusBg,
} from '../utils/status'
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function StatsScreen() {
  const { state } = useApp()
  const { entries } = state

  const streak = getGoodDayStreak(entries)
  const avgCycle = getAverageCycleBetweenBadDays(entries)
  const episodesThisMonth = getEpisodesThisMonth(entries)
  const lastEpisodes = getLastEpisodes(entries, 5)
  const weeklyData = getWeeklyEpisodeCounts(entries, 8)

  const hasData = entries.length > 0

  return (
    <div className="h-full overflow-y-auto bg-surface" style={{ paddingBottom: '6.5rem' }}>
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl px-5 py-4">
        <h1 className="font-headline text-2xl font-bold text-primary">Статистика</h1>
        <p className="font-body text-sm text-on-surface-variant mt-0.5">Ритм здоровья {state.pet.name}</p>
      </header>

      <main className="px-4 pb-4 flex flex-col gap-5 max-w-lg mx-auto">

        {!hasData ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="text-7xl select-none opacity-30">📊</span>
            <p className="font-headline font-bold text-xl text-on-surface-variant">Пока нет данных</p>
            <p className="font-body text-sm text-on-surface-variant/70">Добавьте несколько записей,<br/>чтобы увидеть статистику.</p>
          </div>
        ) : (
          <>
            {/* ── Hero metric: avg cycle ── */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient relative overflow-hidden">
              <div className="absolute -right-8 -top-8 opacity-5 pointer-events-none select-none text-primary">
                <span className="material-symbols-outlined text-[160px] icon-fill">pets</span>
              </div>
              <p className="font-label text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                Среднее между эпизодами
              </p>
              {avgCycle !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-6xl font-extrabold text-secondary-fixed-dim tracking-tighter">
                    {avgCycle.toFixed(1)}
                  </span>
                  <span className="font-headline text-2xl font-bold text-secondary/70">дней</span>
                </div>
              ) : (
                <p className="font-headline text-2xl font-bold text-on-surface-variant">
                  Недостаточно данных
                </p>
              )}
            </div>

            {/* ── Streak + episodes bento ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Streak */}
              <div className="bg-primary-fixed rounded-2xl p-5 flex flex-col justify-between aspect-square relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 opacity-20 pointer-events-none select-none">
                  <span className="material-symbols-outlined text-[90px] icon-fill text-on-primary-fixed">local_fire_department</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest/30 flex items-center justify-center backdrop-blur-sm">
                  <span className="material-symbols-outlined text-on-primary-fixed icon-fill text-[20px]">pets</span>
                </div>
                <div>
                  <p className="font-headline text-sm font-bold text-on-primary-fixed leading-tight">Хороших дней подряд</p>
                  <p className="font-headline text-5xl font-extrabold text-on-primary-fixed mt-1">{streak}</p>
                </div>
              </div>

              {/* Episodes this month */}
              <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col justify-between aspect-square relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none select-none">
                  <span className="material-symbols-outlined text-[90px] icon-fill text-tertiary">warning</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-tertiary-fixed icon-fill text-[20px]">warning</span>
                </div>
                <div>
                  <p className="font-headline text-sm font-bold text-on-surface leading-tight">Эпизодов в этом месяце</p>
                  <p className="font-headline text-5xl font-extrabold text-tertiary mt-1">{episodesThisMonth}</p>
                </div>
              </div>
            </div>

            {/* ── Weekly bar chart ── */}
            <div className="bg-surface-container-low rounded-2xl p-5 shadow-card flex flex-col gap-4">
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface">Эпизоды по неделям</h3>
                <p className="font-label text-xs text-on-surface-variant">Последние 8 недель</p>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barSize={24}>
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: '#737971', fontFamily: 'Be Vietnam Pro' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(77,100,75,0.06)', radius: 8 }}
                      contentStyle={{
                        background: '#fff',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 12,
                        fontFamily: 'Be Vietnam Pro',
                        boxShadow: '0 4px 20px rgba(67,72,65,0.1)',
                      }}
                      formatter={(val: number) => [`${val} эп.`, 'Эпизоды']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {weeklyData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.count === 0 ? '#cfeaca' :
                            entry.status === 'red' ? '#ffdad6' : '#ffddba'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Last 5 episodes ── */}
            <div className="flex flex-col gap-3">
              <h3 className="font-headline font-bold text-base text-on-surface px-1">Последние 5 эпизодов</h3>
              {lastEpisodes.length === 0 ? (
                <div className="bg-primary-fixed/40 rounded-2xl p-5 text-center">
                  <span className="text-3xl select-none">🎉</span>
                  <p className="font-label text-sm text-primary font-medium mt-2">Эпизодов нет — всё хорошо!</p>
                </div>
              ) : (
                lastEpisodes.map(entry => {
                  const status = getEntryStatus(entry)
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 bg-surface-container-lowest rounded-xl px-4 py-3 shadow-card"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: statusBg(status) }}
                      >
                        <span className="text-lg select-none">
                          {status === 'red' ? '🚨' : '⚠️'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-headline font-semibold text-sm text-on-surface capitalize">
                          {format(parseISO(entry.date), 'd MMMM yyyy', { locale: ru })}
                        </p>
                        <p className="font-label text-xs text-on-surface-variant truncate">
                          {[entry.stool.morning, entry.stool.afternoon, entry.stool.evening]
                            .filter(w => w.occurred && w.bristolScale)
                            .map(w => `Б${w.bristolScale}`)
                            .join(' / ') || 'Без данных'}
                          {[entry.stool.morning, entry.stool.afternoon, entry.stool.evening].some(w => w.visibleBlood) && ' · кровь'}
                          {[entry.stool.morning, entry.stool.afternoon, entry.stool.evening].some(w => w.mucus) && ' · слизь'}
                        </p>
                      </div>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: statusColor(status) }}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
