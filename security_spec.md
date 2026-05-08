# SmartNagar AI Security Spec

## Data Invariants
1. Users can only create their own user profile based on `request.auth.uid`. Admins can read all users, users can only read their own profile.
2. A Complaint must be tied to a valid `userId` (the author) and `userId` must match `request.auth.uid`.
3. A Complaint's initial state must be "Pending Review", and its priority must be validated.
4. Only an Admin can change a Complaint's `status` or update its `priority` manually. Citizens can only update upvotes (indirectly) or delete it.
5. Votes must be tied directly to a `request.auth.uid` making the vote. A `getAfter` atomicity check should preferably ensure `upvotesCount` increments precisely when a vote is added, but since we cannot enforce multi-document writes from the database exclusively without specific payloads, we protect the Vote subcollection creation. 

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Creating a complaint with `userId` of another citizen.
2. **Ghost Field Injection**: Adding an `isVerified: true` to a user profile payload during creation.
3. **Privilege Escalation**: Attempting to create a user profile with `role: 'admin'`.
4. **State Shortcutting**: Creating a complaint with `status: 'Resolved'`.
5. **PII Leak**: Querying a list of all user profiles when not admin.
6. **Value Poisoning**: Passing a 2MB string as a category.
7. **Orphaned Vote**: Creating a vote in a non-existent complaint.
8. **Admin Lockout**: Admin trying to update a terminal state "Resolved" and failing (Should succeed because of `|| isAdmin()`).
9. **Timestamp Forgery**: Creating a complaint with `createdAt` in the past.
10. **Array Poisoning**: (N/A here as we use subcollections for votes, but relevant if adding unbounded arrays).
11. **Malicious ID injection**: Path variable with 1000 characters.
12. **Unauthorized Update**: A citizen trying to mark their own complaint as 'Resolved'.

## Red Team Strategy
We will implement absolute restrictions using the 8 Pillars of Hardened Rules. `isAdmin()` helper will inspect a trusted `user` property or `admins` document. To avoid self-assignment of `role: 'admin'`, the user creation rule will enforce `role` can only be `'citizen'`. Admin users must be bootstrapped manually or via email allowlist.
