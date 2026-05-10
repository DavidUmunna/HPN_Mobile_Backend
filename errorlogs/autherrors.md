## Objecttype for mongodb ids not followed
 the object type for the mongodb id representation was not followed , a string id wa used instead, so it caused a findbyid to return null instead of returning the user document 

 # solution
 the solution will be to either cast the string to an objectid type or use a different find tool