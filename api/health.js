export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'findthealien',
    time: new Date().toISOString(),
  });
}
