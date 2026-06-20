export function VietQrBox({ qrUrl }) {
  return (
    <div className="vietqr-box">
      {qrUrl ? (
        <img src={qrUrl} alt="VietQR payment code" />
      ) : (
        <div className="vietqr-box__empty">
          QR code is unavailable
        </div>
      )}
    </div>
  )
}