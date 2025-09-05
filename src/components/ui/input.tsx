import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, ...props }, ref) => {
    const inputClass = className ? `${className}` : ''
    
    return (
      <input
        type={type}
        className={inputClass}
        style={{
          font: 'inherit',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--ink)',
          width: '100%'
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }