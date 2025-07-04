;; Project Tracking Smart Contract
;; Manages Six Sigma project lifecycle and milestones

(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-PROJECT-NOT-FOUND (err u201))
(define-constant ERR-INVALID-PHASE (err u202))
(define-constant ERR-PROJECT-ALREADY-EXISTS (err u203))

(define-data-var admin principal tx-sender)
(define-data-var project-counter uint u0)

;; Project phases
(define-constant PHASE-DEFINE u1)
(define-constant PHASE-MEASURE u2)
(define-constant PHASE-ANALYZE u3)
(define-constant PHASE-IMPROVE u4)
(define-constant PHASE-CONTROL u5)

;; Project data structure
(define-map projects
  { project-id: uint }
  {
    coordinator: principal,
    title: (string-ascii 100),
    current-phase: uint,
    start-date: uint,
    target-completion: uint,
    quality-baseline: uint,
    quality-target: uint,
    defect-reduction-target: uint,
    is-completed: bool,
    tokens-earned: uint
  }
)

;; Phase completion tracking
(define-map phase-completions
  { project-id: uint, phase: uint }
  { completion-date: uint, quality-metric: uint, notes: (string-ascii 500) }
)

;; Create new project
(define-public (create-project
  (coordinator principal)
  (title (string-ascii 100))
  (target-completion uint)
  (quality-target uint)
  (defect-reduction-target uint)
)
  (let ((project-id (+ (var-get project-counter) u1)))
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)

    (map-set projects
      { project-id: project-id }
      {
        coordinator: coordinator,
        title: title,
        current-phase: PHASE-DEFINE,
        start-date: block-height,
        target-completion: target-completion,
        quality-baseline: u0,
        quality-target: quality-target,
        defect-reduction-target: defect-reduction-target,
        is-completed: false,
        tokens-earned: u0
      }
    )

    (var-set project-counter project-id)
    (ok project-id)
  )
)

;; Complete project phase
(define-public (complete-phase
  (project-id uint)
  (phase uint)
  (quality-metric uint)
  (notes (string-ascii 500))
)
  (begin
    (asserts! (is-some (map-get? projects { project-id: project-id })) ERR-PROJECT-NOT-FOUND)
    (asserts! (<= phase PHASE-CONTROL) ERR-INVALID-PHASE)

    (let ((project-data (unwrap! (map-get? projects { project-id: project-id }) ERR-PROJECT-NOT-FOUND)))
      (asserts! (is-eq tx-sender (get coordinator project-data)) ERR-NOT-AUTHORIZED)

      ;; Record phase completion
      (map-set phase-completions
        { project-id: project-id, phase: phase }
        { completion-date: block-height, quality-metric: quality-metric, notes: notes }
      )

      ;; Update project phase
      (if (< phase PHASE-CONTROL)
        (map-set projects
          { project-id: project-id }
          (merge project-data { current-phase: (+ phase u1) })
        )
        (map-set projects
          { project-id: project-id }
          (merge project-data { current-phase: phase, is-completed: true })
        )
      )
    )
    (ok true)
  )
)

;; Get project information
(define-read-only (get-project (project-id uint))
  (map-get? projects { project-id: project-id })
)

;; Get phase completion details
(define-read-only (get-phase-completion (project-id uint) (phase uint))
  (map-get? phase-completions { project-id: project-id, phase: phase })
)

;; Calculate project progress percentage
(define-read-only (get-project-progress (project-id uint))
  (match (map-get? projects { project-id: project-id })
    project-data
      (let ((current-phase (get current-phase project-data)))
        (if (get is-completed project-data)
          u100
          (* (- current-phase u1) u20)
        )
      )
    u0
  )
)

;; Award tokens for project completion
(define-public (award-project-tokens (project-id uint) (token-amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (map-get? projects { project-id: project-id })) ERR-PROJECT-NOT-FOUND)

    (let ((project-data (unwrap! (map-get? projects { project-id: project-id }) ERR-PROJECT-NOT-FOUND)))
      (map-set projects
        { project-id: project-id }
        (merge project-data { tokens-earned: token-amount })
      )
    )
    (ok true)
  )
)
