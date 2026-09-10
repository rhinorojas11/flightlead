# n8n workflow placeholders

No production n8n export is checked in yet. The source document in `sms-enrollment-agent.md` names the nodes, inputs, failure paths, and ownership boundary so an operator can build and test the workflow without pretending an unverified JSON export is deployable.

When a workflow is implemented:

1. export it from the tested n8n environment as sanitized JSON;
2. remove credentials, instance URLs, phone numbers, execution data, and customer records;
3. use credential references and environment variables rather than embedded secrets;
4. commit the export beside the source document with a version/date note; and
5. add an end-to-end test record and rollback procedure.

The TypeScript service remains the home of the qualification schema and domain behavior. Do not fork business rules into opaque code nodes.
