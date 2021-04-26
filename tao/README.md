# TAO Trigrams & Paths

Listing of the Trigrams and Paths for Use Cases

## Trigrams

### Terms

* App
* User
* Profile
* Article
* Tag

### Actions

* New
* Add
* Create
* Store
* Edit
* Update
* Save, Store
* Find
* Fetch
* List
* Browse
* Select
* Locate
* Retrieve
* Enter
* View
* Copy
* Leave

### Orientations

* Anon - for Anonymous
* Portal - for logged in view

## Paths

### Visit Site

|#|trigger|Term|Action|Orient||handler spec|
|---|---|----|------|------|---|-----------|
|0|User requests Site|`Space`|`Edit`|`Portal`|`=>?!`[^b]|can User edit `Space` `?`<br/>`!`User unauthorized|
|1||`Space`|`Edit`|`Portal`|`=>`|get the `Space` Edit form and put it in the UI|
|2|<a id="fn_b">b:</a>User unauthorized|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>
|3|User hits cancel|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>
|4|User hits save|`Space`|`Update`|`Portal`|`=>?!`[^c]|is updated `Space` data valid`?`<br/>`!`validation errors|
|5||`Space`|`Update`|`Portal`|`=>?!`[^b]|can User edit `Space` `?`<br/>`!`User unauthorized|
|6||`Space`|`Update`|`Portal`|`=>`|send the updated `Space` data to the api|
|7|`\`<a id="fn_b">c:</a>`=>`|`Space`|`Fail`|`Portal`|`=>`|render errors in Edit form|
|8|`=>`|`Space`|`Store`|`Admin`|`=>`|store the updated `Space`'s data in primary data store for later retrieval in the `Admin`|
|9|`=>`|`Space`|`Store`|`Portal`|`=>`|store the updated `Space`'s data in cache for later retrieval in the `Portal`|
|10|`=>`|`Space`|`Enter`|`Portal`<td colspan="2">go back to the <a href="#use-case-user-views-space">User Views Space</a> TAO-Path</td>

### Sign Up

### Login

### Logout

### Edit Profile

### Create Article

### Edit Article

### Visit Article

### Comment on Article

### Delete Article Comment

### Favorite Article

### Unfavorite Article





