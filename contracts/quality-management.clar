;; Quality Measurement Smart Contract
;; Tracks and measures quality improvements across processes

(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-MEASUREMENT-NOT-FOUND (err u301))
(define-constant ERR-INVALID-METRIC (err u302))

(define-data-var admin principal tx-sender)
(define-data-var measurement-counter uint u0)

;; Quality measurement data structure
(define-map quality-measurements
  { measurement-id: uint }
  {
    process-name: (string-ascii 100),
    coordinator: principal,
    measurement-date: uint,
    sigma-level: uint,
    defect-rate: uint,
    process-capability: uint,
    baseline-metric: uint,
    current-metric: uint,
    improvement-percentage: uint
  }
)

;; Process baseline tracking
(define-map process-baselines
  { process-name: (string-ascii 100) }
  { baseline-sigma: uint, baseline-defects: uint, baseline-date: uint }
)

;; Record quality measurement
(define-public (record-measurement
  (process-name (string-ascii 100))
  (coordinator principal)
  (sigma-level uint)
  (defect-rate uint)
  (process-capability uint)
  (current-metric uint)
)
  (let ((measurement-id (+ (var-get measurement-counter) u1)))
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (asserts! (<= sigma-level u6) ERR-INVALID-METRIC)

    (let (
      (baseline (map-get? process-baselines { process-name: process-name }))
      (baseline-metric (match baseline base (get baseline-sigma base) u0))
      (improvement (if (> baseline-metric u0)
        (/ (* (- current-metric baseline-metric) u100) baseline-metric)
        u0
      ))
    )
      (map-set quality-measurements
        { measurement-id: measurement-id }
        {
          process-name: process-name,
          coordinator: coordinator,
          measurement-date: block-height,
          sigma-level: sigma-level,
          defect-rate: defect-rate,
          process-capability: process-capability,
          baseline-metric: baseline-metric,
          current-metric: current-metric,
          improvement-percentage: improvement
        }
      )

      (var-set measurement-counter measurement-id)
      (ok measurement-id)
    )
  )
)

;; Set process baseline
(define-public (set-process-baseline
  (process-name (string-ascii 100))
  (baseline-sigma uint)
  (baseline-defects uint)
)
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)

    (map-set process-baselines
      { process-name: process-name }
      { baseline-sigma: baseline-sigma, baseline-defects: baseline-defects, baseline-date: block-height }
    )
    (ok true)
  )
)

;; Get quality measurement
(define-read-only (get-measurement (measurement-id uint))
  (map-get? quality-measurements { measurement-id: measurement-id })
)

;; Get process baseline
(define-read-only (get-process-baseline (process-name (string-ascii 100)))
  (map-get? process-baselines { process-name: process-name })
)

;; Calculate sigma level from defect rate
(define-read-only (calculate-sigma-level (defect-rate uint))
  (if (<= defect-rate u3)
    u6
    (if (<= defect-rate u233)
      u5
      (if (<= defect-rate u6210)
        u4
        (if (<= defect-rate u66807)
          u3
          (if (<= defect-rate u308537)
            u2
            u1
          )
        )
      )
    )
  )
)

;; Get quality trend for process
(define-read-only (get-quality-trend (process-name (string-ascii 100)))
  (let ((baseline (map-get? process-baselines { process-name: process-name })))
    (match baseline
      base-data
        {
          baseline-sigma: (get baseline-sigma base-data),
          baseline-date: (get baseline-date base-data),
          current-measurements: u0  ;; Would need additional logic to count recent measurements
        }
      { baseline-sigma: u0, baseline-date: u0, current-measurements: u0 }
    )
  )
)
