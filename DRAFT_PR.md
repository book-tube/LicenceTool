# Draft Pull Request

## Title
`docs: add licence supply website requirements specification`

## Base / Compare
- Base branch: `main`
- Compare branch: `docs/requirements-spec`

## Summary
This PR adds the initial requirements specification for the Licence Supply Website in `requirements.md`.

The document includes:
- Product scope for private (B2C) and business (B2B) users
- Role-based permissions for admin, private user, and business user
- Core functional requirements, including:
  - globally unique licence keys
  - multi-item/multi-quantity checkout
  - role-based access control
- Fulfillment, refund handling, and auditability expectations
- Non-functional/compliance requirements (GDPR, payment security)
- Initial MVP acceptance criteria

## Why
To establish a clear baseline specification before implementation and align product, engineering, and operations on required behavior.

## Testing / Validation
- Documentation-only change
- No runtime code impact

## Checklist
- [x] Requirements captured for both B2C and B2B users
- [x] Unique licence and multi-item purchase rules documented
- [x] Role permissions and admin boundaries documented
- [ ] Team review and sign-off
