import { useState } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, Eye, FileAudio, ImagePlus, Trash2, Upload } from 'lucide-react'
import { Modal, useToast } from '@/shared/components/ui'

function clampMoveIndex(targetIndex, length) {
  if (length <= 0) return 0
  if (targetIndex < 0) return 0
  if (targetIndex >= length) return length - 1
  return targetIndex
}

const MEDIA_CONFIG = {
  image: {
    label: 'Images',
    empty: 'No images attached',
    accept: 'image/jpeg,image/png,image/webp',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    maxCount: 5,
    maxSizeLabel: '5MB',
    typeLabel: 'PNG, JPEG, or WebP',
    Icon: ImagePlus,
  },
  audio: {
    label: 'Audio',
    empty: 'No audio attached',
    accept: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav',
    allowedTypes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav'],
    maxSize: 20 * 1024 * 1024,
    maxCount: 3,
    maxSizeLabel: '20MB',
    typeLabel: 'MP3, M4A, or WAV',
    Icon: FileAudio,
  },
}

function itemUrl(item) {
  return item.previewUrl || item.mediaUrl || item.url || null
}

function itemName(item) {
  return item.fileName || item.originalFileName || item.file?.name || 'Attachment'
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!bytes) return null
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB'
  return bytes + ' B'
}

function mediaMetaLabel(item, index) {
  const parts = []
  parts.push(index === 0 ? 'Primary' : item.source === 'pending' ? 'Pending upload' : 'Attached')
  const size = formatBytes(item.sizeBytes || item.fileSize || item.file?.size)
  if (size) parts.push(size)
  if (item.importSource && item.importSource !== 'manual') parts.push(item.importSource)
  return parts.join(' / ')
}

export function QuestionMediaManager({ mediaType, items, disabled, onAddFiles, onRemove, onMoveTo }) {
  const config = MEDIA_CONFIG[mediaType]
  const toast = useToast()
  const Icon = config.Icon
  const remainingSlots = Math.max(0, config.maxCount - items.length)
  const [previewItem, setPreviewItem] = useState(null)
  const previewUrl = previewItem ? itemUrl(previewItem) : null

  function requestMoveTo(index, targetIndex) {
    if (disabled || items.length < 2) return
    const safeTarget = clampMoveIndex(targetIndex, items.length)
    if (index === safeTarget) return
    onMoveTo(index, safeTarget)
  }

  function validateFiles(files) {
    if (!files.length) return []
    if (files.length > remainingSlots) {
      toast.error(config.label + ' cannot exceed ' + config.maxCount + ' files per question.')
      return []
    }
    const validFiles = []
    for (const file of files) {
      if (!config.allowedTypes.includes(file.type)) {
        toast.error(itemName({ file }) + ' is not supported. ' + config.typeLabel + ' only.')
        return []
      }
      if (file.size > config.maxSize) {
        toast.error(itemName({ file }) + ' exceeds ' + config.maxSizeLabel + '.')
        return []
      }
      validFiles.push(file)
    }
    return validFiles
  }

  function handleFiles(event) {
    const validFiles = validateFiles(Array.from(event.target.files || []))
    event.target.value = ''
    if (validFiles.length) onAddFiles(validFiles)
  }

  return (
    <div className="question-media-manager">
      <div className="question-media-manager__toolbar">
        <div>
          <div className="question-media-manager__title">{config.label}</div>
          <div className="question-media-manager__hint">{config.typeLabel}. Max {config.maxSizeLabel}. {items.length}/{config.maxCount} used.</div>
        </div>
        <label className={'button button--secondary button--sm ' + (disabled || remainingSlots === 0 ? 'is-disabled' : '')}>
          <Upload size={14} />
          Add
          <input
            type="file"
            accept={config.accept}
            multiple
            hidden
            disabled={disabled || remainingSlots === 0}
            onChange={handleFiles}
          />
        </label>
      </div>

      {items.length ? (
        <div className="question-media-manager__list">
          {items.map((item, index) => {
            const url = itemUrl(item)
            return (
              <div className={'question-media-manager__item ' + (mediaType === 'audio' ? 'question-media-manager__item--audio' : '')} key={item.localId || item.attachmentId || item.id || mediaType + '-' + index}>
                {mediaType === 'audio' ? (
                  <>
                    <div className="question-media-manager__audio-label">
                      <strong>Audio{index + 1}</strong>
                    </div>
                    <div className="question-media-manager__audio-player">
                      {url ? (
                        <audio controls preload="metadata" src={url}>
                          <track kind="captions" />
                        </audio>
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="question-media-manager__preview"
                      disabled={!url}
                      onClick={() => setPreviewItem(item)}
                      aria-label={'Preview ' + itemName(item)}
                    >
                      {url ? <img src={url} alt={itemName(item)} /> : null}
                      {!url ? <Icon size={20} /> : null}
                      {url ? <span className="question-media-manager__preview-badge"><Eye size={13} /></span> : null}
                    </button>
                    <div className="question-media-manager__meta">
                      <strong>{index + 1}. {itemName(item)}</strong>
                      <span>{mediaMetaLabel(item, index)}</span>
                    </div>
                  </>
                )}
                <div className="question-media-manager__actions">
                  <button type="button" className="admin-table__icon-btn" disabled={disabled || index === 0} onClick={() => requestMoveTo(index, 0)} aria-label="Move media to primary"><ArrowUpToLine size={15} /></button>
                  <button type="button" className="admin-table__icon-btn" disabled={disabled || index === 0} onClick={() => requestMoveTo(index, index - 1)} aria-label="Move media up"><ArrowUp size={15} /></button>
                  <button type="button" className="admin-table__icon-btn" disabled={disabled || index === items.length - 1} onClick={() => requestMoveTo(index, index + 1)} aria-label="Move media down"><ArrowDown size={15} /></button>
                  <button type="button" className="admin-table__icon-btn" disabled={disabled || index === items.length - 1} onClick={() => requestMoveTo(index, items.length - 1)} aria-label="Move media to end"><ArrowDownToLine size={15} /></button>
                  <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" disabled={disabled} onClick={() => onRemove(item)} aria-label="Remove media"><Trash2 size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="question-media-manager__empty">
          <Icon size={22} />
          <span>{config.empty}</span>
        </div>
      )}

      <Modal
        open={Boolean(previewItem)}
        title={previewItem ? itemName(previewItem) : ''}
        size="xl"
        onClose={() => setPreviewItem(null)}
      >
        {previewItem && (
          <div className="question-media-preview-modal">
            {mediaType === 'image' && previewUrl ? <img src={previewUrl} alt={itemName(previewItem)} /> : null}

            <div className="question-media-preview-modal__meta">
              <span>{mediaMetaLabel(previewItem, items.findIndex((item) => item === previewItem))}</span>
              {previewItem.contentType ? <span>{previewItem.contentType}</span> : null}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}



