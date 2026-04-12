import { useState } from 'react'
import './FormInput.css'

function FormInput({ type = 'text', id, placeholder, value, onChange, required = false }) {
  const [focused, setFocused] = useState(false)
  const isActive = focused || (value && value.length > 0)

  return (
    <div className={`form-input-wrapper ${isActive ? 'active' : ''}`}>
      <input
        type={type}
        id={id}
        className="form-input"
        placeholder=" "
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
      />
      <label htmlFor={id} className="form-label">{placeholder}</label>
      <div className="form-input-highlight"></div>
    </div>
  )
}

export default FormInput
