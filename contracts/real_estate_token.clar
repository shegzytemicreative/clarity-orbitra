;; Implements SIP009 NFT interface
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)

;; Define tokens
(define-non-fungible-token property-token uint)
(define-fungible-token fractional-token)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-invalid-percentage (err u102))
(define-constant err-token-not-found (err u103))

;; Data structures
(define-map properties
    uint 
    {
        owner: principal,
        location: (string-ascii 256),
        square-feet: uint,
        property-type: (string-ascii 64),
        construction-year: uint,
        total-fractions: uint
    }
)

(define-map fractional-owners
    { property-id: uint, owner: principal }
    uint  ;; percentage owned (1-100)
)

;; Property counter
(define-data-var last-token-id uint u0)

;; Administrative Functions
(define-public (mint-property 
    (recipient principal)
    (location (string-ascii 256))
    (square-feet uint)
    (property-type (string-ascii 64))
    (construction-year uint))
    (let
        ((token-id (+ (var-get last-token-id) u1)))
        (if (is-eq tx-sender contract-owner)
            (begin
                (try! (nft-mint? property-token token-id recipient))
                (map-set properties token-id {
                    owner: recipient,
                    location: location,
                    square-feet: square-feet,
                    property-type: property-type,
                    construction-year: construction-year,
                    total-fractions: u100
                })
                (var-set last-token-id token-id)
                (ok token-id))
            err-owner-only)))

;; Fractional ownership functions
(define-public (create-fraction 
    (token-id uint)
    (recipient principal)
    (percentage uint))
    (let ((property (unwrap! (map-get? properties token-id) err-token-not-found))
          (sender-principal tx-sender))
        (if (and
                (is-eq (get owner property) sender-principal)
                (<= percentage u100))
            (begin
                (map-set fractional-owners 
                    {property-id: token-id, owner: recipient}
                    percentage)
                (ok true))
            err-not-token-owner)))

;; Transfer functions
(define-public (transfer-property
    (token-id uint)
    (sender principal)
    (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (try! (nft-transfer? property-token token-id sender recipient))
        (let ((property (unwrap! (map-get? properties token-id) err-token-not-found)))
            (map-set properties token-id
                (merge property {owner: recipient}))
            (ok true))))

;; Read functions
(define-read-only (get-property-details (token-id uint))
    (ok (map-get? properties token-id)))

(define-read-only (get-fractional-ownership (token-id uint) (owner principal))
    (ok (map-get? fractional-owners {property-id: token-id, owner: owner})))

(define-read-only (get-last-token-id)
    (ok (var-get last-token-id)))

;; SIP009 NFT Required Functions
(define-public (get-last-token-minted)
    (ok (var-get last-token-id)))

(define-read-only (get-token-uri (token-id uint))
    (ok (some (concat "https://api.orbitra.com/metadata/" (uint-to-ascii token-id)))))

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (transfer-property token-id sender recipient))