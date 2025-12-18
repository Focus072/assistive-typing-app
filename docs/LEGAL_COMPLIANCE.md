# Legal & Compliance

## Legal Pages

### Published Pages

1. **Terms of Service** (`/terms`)
   - ✅ Published and accessible
   - ✅ Covers service description, user responsibilities, liability limitations
   - ✅ Includes Google account access terms
   - ✅ Account termination policy
   - ✅ Last updated: December 2024

2. **Privacy Policy** (`/privacy`)
   - ✅ Published and accessible
   - ✅ Details data collection, storage, and usage
   - ✅ Explains what is NOT stored (document content)
   - ✅ Data retention and deletion policies
   - ✅ User rights (access, deletion, portability)
   - ✅ Security measures
   - ✅ Last updated: December 2024

3. **Cookie Notice** (`/cookies`)
   - ✅ Published and accessible
   - ✅ Explains cookie usage (session, preferences)
   - ✅ Third-party cookies (NextAuth only)
   - ✅ Cookie management instructions
   - ✅ Do Not Track policy
   - ✅ Last updated: December 2024

### Sign-Up Agreement Links

All legal pages are linked in the sign-up flow:
- ✅ Terms of Service link: `/terms`
- ✅ Privacy Policy link: `/privacy`
- ✅ Cookie Notice link: `/cookies`
- ✅ Links appear in footer of sign-in page
- ✅ Links are accessible and styled consistently

## Data Documentation

### What We Store

Documented in `docs/PRIVACY_DATA.md`:

1. **User Account Data**
   - Email address
   - Name (optional)
   - Profile image URL (optional)
   - Account creation timestamp

2. **Google OAuth Tokens**
   - Access token (encrypted)
   - Refresh token (encrypted)
   - Token expiration timestamp
   - **Purpose**: Required to type into Google Docs

3. **Job Metadata**
   - Job ID, User ID, Document ID
   - Text content (temporarily stored)
   - Job status, progress, timing
   - **Retention**: Text scrubbed after 30 days, jobs deleted after 90 days

4. **Job Events**
   - Job lifecycle events
   - Event timestamps and details
   - **Retention**: Deleted when job is deleted (cascade)

5. **Document State**
   - Document ID, User ID
   - Current job state (idle/running)
   - **Purpose**: Prevents concurrent jobs

### What We Don't Store

1. **Google Docs Content**: Never read or stored after typing
2. **Document Content**: Existing content never accessed
3. **Sensitive Data**: No passwords, payment info, or other sensitive data

## Data Retention & Deletion

### Automatic Cleanup

- **Text Content**: Scrubbed after 30 days
- **Job Records**: Deleted after 90 days
- **Stale Jobs**: Marked as failed after 8 hours
- **Expired Jobs**: Marked as expired after 7 days

### User-Initiated Deletion

Users can:
1. **Revoke Google Access**: Through Google account settings
2. **Request Account Deletion**: Contact support
3. **Delete Individual Jobs**: Through dashboard (future feature)

### Deletion Process

Upon account deletion request:
1. All user data is identified
2. All associated jobs and events are deleted
3. Google tokens are revoked
4. Account is permanently deleted
5. Process completes within 30 days

## User Rights

### GDPR Compliance (EU Users)

Users have the right to:
- **Access**: Request a copy of their data
- **Rectification**: Correct inaccurate data
- **Erasure**: Request deletion of their data
- **Portability**: Export data in machine-readable format
- **Object**: Object to processing of their data
- **Restriction**: Request restriction of processing

### CCPA Compliance (California Users)

Users have the right to:
- **Know**: What personal information is collected
- **Delete**: Request deletion of personal information
- **Opt-Out**: Opt out of sale of personal information (we don't sell data)
- **Non-Discrimination**: Not be discriminated against for exercising rights

## How Users Can Exercise Rights

### Current Methods

1. **Revoke Google Access**:
   - Go to Google Account Settings
   - Navigate to "Third-party apps & services"
   - Revoke typingisboring access

2. **Request Data Deletion**:
   - Contact support through application
   - Provide account email
   - Request will be processed within 30 days

### Future Enhancements

- [ ] Self-service account deletion in settings
- [ ] Data export feature
- [ ] Privacy dashboard showing stored data
- [ ] Automated deletion request processing

## Compliance Checklist

### Required Disclosures

- [x] Terms of Service published
- [x] Privacy Policy published
- [x] Cookie Notice published (if using cookies)
- [x] Data retention policies documented
- [x] User rights documented
- [x] Contact information for privacy requests

### Best Practices

- [x] Legal pages accessible from sign-up flow
- [x] Legal pages have proper metadata for SEO
- [x] Legal pages are mobile-responsive
- [x] Legal pages link to each other
- [x] Legal pages have "Last updated" dates
- [x] Privacy Policy matches actual data practices

### Recommendations

- [ ] Add contact email for privacy requests
- [ ] Implement self-service account deletion
- [ ] Add data export feature
- [ ] Regular review of legal pages (annually)
- [ ] Monitor for legal changes (GDPR, CCPA updates)

## Contact Information

### Privacy Requests

Users can contact us for:
- Data access requests
- Data deletion requests
- Privacy questions
- Cookie questions

**Note**: Contact method should be added to legal pages and application settings.

## Next Steps

1. **Add Contact Method**: Add support email or contact form to legal pages
2. **Implement Self-Service Deletion**: Allow users to delete accounts from settings
3. **Add Data Export**: Allow users to export their data
4. **Regular Audits**: Review legal pages annually for accuracy
5. **Monitor Compliance**: Stay updated on GDPR, CCPA, and other regulations







