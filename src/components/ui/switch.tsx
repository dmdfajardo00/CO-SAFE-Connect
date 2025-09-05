import * as React from "react"

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className="switch"
        ref={ref}
        {...props}
      />
    )
  }
)
Switch.displayName = "Switch"

export { Switch }