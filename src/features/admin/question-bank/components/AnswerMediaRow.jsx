import { useEffect, useRef, useState } from 'react'
import { FileAudio, FileVideo, ImagePlus, Loader2, X } from 'lucide-react'
import { useToast } from '@/shared/components/ui'

const MEDIA_CONFIG = {
  image: {
    label: 'Image',
    accept: 'image/jpeg,image/png,image/webp',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    maxSizeLabel: '5MB',
    typeLabel: 'JPEG, PNG, or WebP',
    Icon: ImagePlus,
  },
  audio: {
    label: 'Audio',
    accept: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav',
    allowedTypes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav'],
    maxSize: 20 * 1024 * 1024,
    maxSizeLabel: '20MB',
    typeLabel: 'MP3, M4A, or WAV',
    Icon: FileAudio,
  },
  video: {
    label: 'Video',
    accept:
      'video/mp4,video/mpeg,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,video/x-ms-wmv,video/3gpp,video/x-flv',
    allowedTypes: [
      'video/mp4',
      'video/mpeg',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/3gpp',
      'video/x-flv',
    ],
    maxSize: 100 * 1024 * 1024,
    maxSizeLabel: '100MB',
    typeLabel: 'MP4, WebM, MOV, AVI, MKV, WMV, 3GP, FLV, or MPEG',
    Icon: FileVideo,
  },
}

function itemUrl(item) {
  if (!item) return null
  return item.previewUrl || item.mediaUrl || item.url || null
}

function itemName(item) {
  if (!item) return 'Attachment'
  return item.fileName || item.originalFileName || item.file?.name || 'Attachment'
}

export function AnswerMediaRow({
  media,
  disabled,
  uploading,
  onUpload,
  onRemove,
}) {
  const toast = useToast()
  const [previewUrl, setPreviewUrl] = useState(null)
  const lastPreviewRef = useRef(null)

  useEffect(() => {
    const currentUrl = itemUrl(media?.video)
    if (lastPreviewRef.current && lastPreviewRef.current !== currentUrl) {
      URL.revokeObjectURL(lastPreviewRef.current)
      lastPreviewRef.current = null
    }
    return () => {
      if (lastPreviewRef.current) {
        URL.revokeObjectURL(lastPreviewRef.current)
        lastPreviewRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.video?.previewUrl, media?.video?.url])

  function openPreview() {
    const url = itemUrl(media?.video)
    if (!url) return
    setPreviewUrl(url)
  }

  function closePreview() {
    setPreviewUrl(null)
  }

  function handleFile(mediaType, event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const config = MEDIA_CONFIG[mediaType]
    if (!config.allowedTypes.includes(file.type)) {
      toast.error(`${config.label} must be ${config.typeLabel}.`)
      return
    }
    if (file.size > config.maxSize) {
      toast.error(`${config.label} must not exceed ${config.maxSizeLabel}.`)
      return
    }
    onUpload?.(mediaType, file)
  }

  function renderTile(mediaType, item) {
    const config = MEDIA_CONFIG[mediaType]
    const Icon = config.Icon
    const url = itemUrl(item)
    if (!item) return null

    let previewNode
    if (mediaType === 'image' && url) {
      previewNode = <img src={url} alt={itemName(item)} />
    } else if (mediaType === 'audio' && url) {
      previewNode = (
        <audio controls preload="metadata" src={url}>
          <track kind="captions" />
        </audio>
      )
    } else if (mediaType === 'video' && url) {
      previewNode = (
        <button
          type="button"
          className="answer-media-tile__video-trigger"
          onClick={openPreview}
          aria-label="Preview video"
        >
          <Icon size={18} />
          <span>Preview</span>
        </button>
      )
    } else {
      previewNode = <Icon size={18} />
    }

    return (
      <div
        className={`answer-media-tile answer-media-tile--${mediaType}`}
        key={`${mediaType}-${item.attachmentId || item.localId || item.id || 'pending'}`}
      >
        <div className="answer-media-tile__preview">{previewNode}</div>
        <div className="answer-media-tile__meta">
          <strong>{itemName(item)}</strong>
          <span>{config.label}{item.uploading ? ' / Uploading...' : ''}</span>
        </div>
        <button
          type="button"
          className="answer-media-tile__remove admin-table__icon-btn admin-table__icon-btn--danger"
          disabled={disabled}
          onClick={() => onRemove?.(mediaType, item)}
          aria-label={`Remove ${config.label.toLowerCase()}`}
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="answer-media-row">
      <div className="answer-media-buttons">
        {['image', 'audio', 'video'].map((mediaType) => {
          const config = MEDIA_CONFIG[mediaType]
          const Icon = config.Icon
          const taken = Boolean(media?.[mediaType])
          const isUploading = uploading === mediaType
          return (
            <label
              key={mediaType}
              className={`answer-media-button ${disabled || taken || isUploading ? 'is-disabled' : ''}`}
              title={taken ? `${config.label} already attached` : `Upload ${config.label.toLowerCase()}`}
              aria-label={`Upload ${config.label.toLowerCase()}`}
            >
              {isUploading ? <Loader2 size={14} /> : <Icon size={14} />}
              <span>{config.label}</span>
              <input
                type="file"
                accept={config.accept}
                hidden
                disabled={disabled || taken || isUploading}
                onChange={(event) => handleFile(mediaType, event)}
              />
            </label>
          )
        })}
      </div>
      {(media?.image || media?.audio || media?.video) ? (
        <div className="answer-media-tiles">
          {renderTile('image', media?.image)}
          {renderTile('audio', media?.audio)}
          {renderTile('video', media?.video)}
        </div>
      ) : null}
      {previewUrl ? (
        <div className="answer-media-preview-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="answer-media-preview-overlay__close"
            onClick={closePreview}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
          <video controls autoPlay preload="metadata" src={previewUrl}>
            <track kind="captions" />
          </video>
        </div>
      ) : null}
    </div>
  )
}