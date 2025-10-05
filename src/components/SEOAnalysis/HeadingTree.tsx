import React, { useState } from 'react';
import { SEOHeading } from '../../types/seo';
import { ChevronDownIcon, ChevronUpIcon } from '../../assets/icons';
import './HeadingTree.css';

interface HeadingNode extends SEOHeading {
    children: HeadingNode[];
}

function buildHeadingTree(headings: SEOHeading[], hideDuplicates: boolean): HeadingNode[] {
    // Filter out duplicates if hideDuplicates is true
    const filteredHeadings = hideDuplicates 
        ? headings.filter(h => h.duplicateOf === undefined)
        : headings;

    const roots: HeadingNode[] = [];
    const stack: HeadingNode[] = [];

    filteredHeadings.forEach(h => {
        const levelNum = Number(h.level[1]);
        const node: HeadingNode = { ...h, children: [] };

        // Pop until we find a parent of lower level
        while (stack.length && Number(stack[stack.length - 1].level[1]) >= levelNum) {
            stack.pop();
        }

        if (stack.length === 0) {
            roots.push(node);
        } else {
            stack[stack.length - 1].children.push(node);
        }
        stack.push(node);
    });

    return roots;
}

interface HeadingRowProps {
    node: HeadingNode;
    depth?: number;
}

function HeadingRow({ node, depth = 0 }: HeadingRowProps) {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children.length > 0;

    return (
        <div className="heading-tree-item" style={{ marginLeft: depth * 20 }}>
            <div className="heading-tree-row">
                {hasChildren ? (
                    <button 
                        className="heading-tree-toggle"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? "Collapse section" : "Expand section"}
                    >
                        {isOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
                    </button>
                ) : (
                    <span className="heading-tree-indent" />
                )}

                <div className="heading-tree-content">
                    <span className="heading-level-badge">
                        {node.level.toUpperCase()}
                    </span>
                    <span className="heading-text">
                        {node.text}
                    </span>
                    {!node.visible && (
                        <span className="heading-meta">(hidden)</span>
                    )}
                    {node.duplicateOf !== undefined && (
                        <span className="heading-meta">(duplicate)</span>
                    )}
                </div>
            </div>

            {hasChildren && isOpen && (
                <div className="heading-tree-children">
                    {node.children.map((child, index) => (
                        <HeadingRow 
                            key={child.index || index} 
                            node={child} 
                            depth={depth + 1} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface HeadingTreeProps {
    headings: SEOHeading[];
}

export function HeadingTree({ headings }: HeadingTreeProps) {
    const [hideDuplicates, setHideDuplicates] = useState(true);
    const tree = buildHeadingTree(headings, hideDuplicates);
    const duplicateCount = headings.filter(h => h.duplicateOf !== undefined).length;

    return (
        <div className="heading-tree">
            {duplicateCount > 0 && (
                <div className="heading-tree-controls">
                    <label className="heading-tree-toggle-label">
                        <input
                            type="checkbox"
                            checked={hideDuplicates}
                            onChange={(e) => setHideDuplicates(e.target.checked)}
                        />
                        Hide {duplicateCount} duplicate heading{duplicateCount !== 1 ? 's' : ''}
                    </label>
                </div>
            )}
            {tree.map((node, index) => (
                <HeadingRow key={node.index || index} node={node} />
            ))}
        </div>
    );
}