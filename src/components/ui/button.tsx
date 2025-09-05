import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'emergency' | 'safe' | 'warning'
  size?: 'default' | 'lg' | 'block'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const getButtonClass = () => {
      let baseClass = 'btn'
      
      if (variant === 'secondary') baseClass += ' secondary'
      else if (variant === 'ghost') baseClass += ' ghost'
      
      if (size === 'lg') baseClass += ' lg'
      else if (size === 'block') baseClass += ' block'
      
      return baseClass + (className ? ` ${className}` : '')
    }

    return (
      <button
        className={getButtonClass()}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }