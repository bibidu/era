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
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header>
              <Drawer.Heading>添加素材</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="px-4 pb-6">
              <div className="grid grid-cols-4 gap-4">
                <button
                  type="button"
                  className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition-colors active:bg-neutral-100"
                  onClick={() => {
                    onAddText()
                    onOpenChange(false)
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
                    <Type size={24} strokeWidth={2} />
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
