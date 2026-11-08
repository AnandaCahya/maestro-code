import React from 'react'
import { useEditorStore } from '../../store/useEditorStore'
import { EditorGroupPane } from './EditorGroupPane'

export const EditorCanvas: React.FC = () => {
  const { editorSplitMode, activeEditorGroup, focusEditorGroup } = useEditorStore()

  return (
    <div className="flex-1 w-full h-full flex flex-col p-2.5 overflow-hidden bg-studio-bg select-none">
      {(editorSplitMode === 'none' || !['vertical', 'horizontal'].includes(editorSplitMode)) && (
        <div className="flex-1 w-full h-full min-w-0 min-h-0 flex flex-col overflow-hidden">
          <EditorGroupPane
            group={1}
            isActive={true}
            onFocus={() => focusEditorGroup(1)}
          />
        </div>
      )}

      {editorSplitMode === 'vertical' && (
        <div className="flex-1 w-full h-full min-w-0 min-h-0 flex flex-row gap-2 overflow-hidden">
          <div className="flex-1 h-full min-w-0 overflow-hidden">
            <EditorGroupPane
              group={1}
              isActive={activeEditorGroup === 1}
              onFocus={() => focusEditorGroup(1)}
            />
          </div>
          <div className="flex-1 h-full min-w-0 overflow-hidden">
            <EditorGroupPane
              group={2}
              isActive={activeEditorGroup === 2}
              onFocus={() => focusEditorGroup(2)}
            />
          </div>
        </div>
      )}

      {editorSplitMode === 'horizontal' && (
        <div className="flex-1 w-full h-full min-w-0 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="flex-1 w-full min-h-0 overflow-hidden">
            <EditorGroupPane
              group={1}
              isActive={activeEditorGroup === 1}
              onFocus={() => focusEditorGroup(1)}
            />
          </div>
          <div className="flex-1 w-full min-h-0 overflow-hidden">
            <EditorGroupPane
              group={2}
              isActive={activeEditorGroup === 2}
              onFocus={() => focusEditorGroup(2)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
export default EditorCanvas
