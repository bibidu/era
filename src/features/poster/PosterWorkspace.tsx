import { Button } from '@heroui/react'
import { Plus, Save } from 'lucide-react'
import { MaterialSheet } from '../../components/MaterialSheet'
import { PosterCanvas } from '../../components/PosterCanvas'
import { TextEditorSheet } from '../../components/TextEditorSheet'
import type { usePosterEditor } from './usePosterEditor'

type PosterEditor = ReturnType<typeof usePosterEditor>

interface PosterWorkspaceProps {
  editor: PosterEditor
}

export function PosterWorkspace({ editor }: PosterWorkspaceProps) {
  return (
    <>
      <PosterCanvas
        posterUrl={editor.posterUrl}
        posterSize={editor.posterSize}
        texts={editor.texts}
        selectedId={editor.selectedId}
        isExporting={editor.isExporting}
        onSelectText={editor.handleSelectText}
        onOpenConfig={editor.handleOpenConfig}
        onDeleteText={editor.handleDeleteText}
        onUpdateText={editor.handleUpdateText}
        onUploadPoster={editor.handleUploadPoster}
        onCanvasResize={editor.handleCanvasResize}
        onPosterSizeResolved={editor.handlePosterSizeResolved}
      />

      <footer className="sticky bottom-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {(editor.saveMessage || editor.uploadError) && (
          <p className="mb-2 text-center text-xs text-neutral-600">
            {editor.saveMessage || editor.uploadError}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1 border-neutral-300 bg-white text-black"
            isDisabled={!editor.posterUrl}
            onPress={() => editor.setMaterialOpen(true)}
          >
            <Plus size={18} />
            添加素材
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-black text-white"
            isDisabled={!editor.posterUrl || editor.saving}
            onPress={editor.handleSave}
          >
            <Save size={18} />
            {editor.saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </footer>

      <MaterialSheet
        isOpen={editor.materialOpen}
        onOpenChange={editor.setMaterialOpen}
        onAddText={editor.handleAddText}
      />

      <TextEditorSheet
        text={editor.selectedText}
        isOpen={editor.editorOpen}
        canvasHeight={editor.canvasHeight}
        onClose={editor.handleEditorClose}
        onUpdate={editor.handleUpdateText}
      />
    </>
  )
}
