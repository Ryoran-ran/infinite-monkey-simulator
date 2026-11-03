type IconName = 'play' | 'pause' | 'reset' | 'download' | 'arrow' | 'check' | 'chart' | 'terminal' | 'infinity' | 'settings'
const paths: Record<IconName, string> = {
  play: 'M9 5l11 7-11 7V5Z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M3 11a9 9 0 1 1 2.5 7M3 4v7h7',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  check: 'M5 12l4 4L19 6',
  chart: 'M4 4v16h17M7 15h4v-4h4V7h6',
  terminal: 'm4 6 6 6-6 6m9 0h7',
  infinity: 'M12 12C7-1 0 7 3 13s6 5 9-1c5-13 12-5 9 1s-6 5-9-1Z',
  settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
}
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
