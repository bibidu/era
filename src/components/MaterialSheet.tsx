import { Drawer, useOverlayState } from '@heroui/react'
import { Type } from 'lucide-react'
import { useEffect } from 'react'

interface MaterialSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddText: () => void
}

export function MaterialSheet({ isOpen, onOpenChange, onAddText }: MaterialSheetProps) {
  const state = useOverlayState({ isOpen, onOpenChange })

  useEffect(() => {
    if (isOpen !== state.isOpen) {
      state.setOpen(isOpen)
    }
  }, [isOpen, state])

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="material-sheet max-h-[33dvh]">
            <Drawer.Handle />
            <Drawer.Header className="py-2">
              <Drawer.Heading>添加素材</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-300 bg-white p-3 transition-colors active:bg-neutral-100"
                  onClick={() => {
                    onAddText()
                    onOpenChange(false)
                  }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                    <Type size={20} strokeWidth={2} />
                  </div>
                  <span className="text-xs text-neutral-600">文本</span>
                </button>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
