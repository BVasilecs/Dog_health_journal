interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  colorOn?: string
}

export default function Toggle({ checked, onChange, colorOn }: ToggleProps) {
  const bgOn = colorOn ?? '#4d644b'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex-shrink-0 focus:outline-none"
      style={{
        width: '3.25rem',
        height: '1.875rem',
        borderRadius: '9999px',
        backgroundColor: checked ? bgOn : '#e4e2de',
        transition: 'background-color 0.2s',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '50%',
          transform: checked ? 'translateX(1.375rem) translateY(-50%)' : 'translateX(0) translateY(-50%)',
          left: 4,
          width: '1.375rem',
          height: '1.375rem',
          borderRadius: '9999px',
          backgroundColor: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.3,0.64,1)',
        }}
      />
    </button>
  )
}
