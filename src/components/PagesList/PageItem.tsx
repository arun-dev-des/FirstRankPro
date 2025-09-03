import React from 'react'
import { Page } from '../../types/page'
import './styles.css'

interface PageItemProps {
    page: Page
    onSelect: (page: Page) => void
}

export function PageItem({ page, onSelect }: PageItemProps) {
    return (
        <div 
            className="page-item"
            onClick={() => onSelect(page)}
        >
            <span className="page-status">✗</span>
            <span className="page-name">{page.name}</span>
        </div>
    )
}
