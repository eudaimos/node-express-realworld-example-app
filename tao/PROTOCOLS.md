# Protocols

### Protocol Definitions

- Authorization Protocols
  - [Ensuring Authorization](#ensuring-authorization)
  - [Locate Authorization](#locate-authorization)
  - [Missing Authorization](#missing-authorization)

## Ensuring Authorization

Anytime a request comes into the API the Orientation needs to be established.

If it is `portal` then we must ensure a valid auth by ensuring the `User` from
the incoming token is in the database and attached to the `portal` context data.

| #   | flow                                                                                                 | Term  | Action | Orient   |                             | destination                              |
| --- | ---------------------------------------------------------------------------------------------------- | ----- | ------ | -------- | --------------------------- | ---------------------------------------- |
| 0.  | API call made                                                                                        | `*:t` | `*:a`  | `portal` | `=>?!`<sup>[a](#fn_a)</sup> | missing `portal.auth`?<br/>!missing auth |
| 1.  | `=\`<a name="fn_a">a:</a>`>`|`auth`|`locate`|`portal`||[Locate Authorization](#locate-authorization) |
| 1.  | `===>`                                                                                               | `{t}` | `{a}`  | `portal` |                             |                                          |

## Locate Authorization

If `auth` is missing from the `portal` context data, find and attach it.

AppCon Coming into Protocol:

```javascript
{
  auth: undefined,
  locate: {
    ?next: AppCon
  },
  portal: {
    // decoded from the jwt.payload
    token: {
      id: '5db931d67aa8ec3a4010242d',
      username: 'somo',
      exp: 1593440464,
      iat: 1588256464
    }
  }
}
```

AppCon Resulting from Protocol:

```javascript
{
  …,
  portal: {
    auth: User,
    // decoded from the jwt.payload
    token: {
      id: '5db931d67aa8ec3a4010242d',
      username: 'somo',
      exp: 1593440464,
      iat: 1588256464
    }
  }
}
```

| #   | flow                                                                               | Term            | Action          | Orient          |                             | destination                                       |
| --- | ---------------------------------------------------------------------------------- | --------------- | --------------- | --------------- | --------------------------- | ------------------------------------------------- |
| 0.  |                                                                                    | `auth`          | `locate`        | `portal`        | `=>?!`<sup>[b](#fn_b)</sup> | missing `portal.token`?<br/>!missing auth         |
| 1.  | `=\`<a name="fn_b">b:</a>`>`|`auth`|`miss`|`portal`||[Missing Auth](#missing-auth) |
| 1.  | `===>`                                                                             | `auth`          | `retrieve`      | `portal`        | `=>?!`<sup>[c](#fn_c)</sup> | missing `auth.id`?<br/>!missing auth              |
| 2.  | `=\`<a name="fn_c">c:</a>`>`|`auth`|`miss`|`portal`||[Missing Auth](#missing-auth) |
| 2.  | `===>`                                                                             | `auth`          | `load`          | `portal`        | `=>?!`<sup>[d](#fn_d)</sup> | missing `auth` OR `auth !User`?<br/>!missing auth |
| 2.  |                                                                                    | `auth`          | `load`          | `portal`        | `=>?!`<sup>[e](#fn_e)</sup> | no `load.next`?<br/>!enter user                   |
| 3.  | `=\`<a name="fn_d">d:</a>`>`|`auth`|`miss`|`portal`||[Missing Auth](#missing-auth) |
| 3.  | `=\`<a name="fn_e">e:</a>`>`|`user`|`enter`|`portal`||[Enter User](#enter-user)    |
| 3.  | `===>`                                                                             | `{load.next.t}` | `{load.next.a}` | `{load.next.o}` |                             |                                                   |

## Missing Authorization

If `auth` cannot be found when requested then signal missing.

| #   | flow | Term   | Action | Orient   | description                            |
| --- | ---- | ------ | ------ | -------- | -------------------------------------- |
| 0.  |      | `auth` | `miss` | `portal` | Endpoints must listen for this context |
