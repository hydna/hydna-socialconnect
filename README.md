# Hydna social connect

An example app using facebook connect and [hydna](http://hydna.com/) to connect your friends in real-time.

Login with your facebook credentials at [http://hydna.github.io/hydna-socialconnect](http://hydna.github.io/hydna-socialconnect) and then have one or more of your friends do the same.

## What does it do

The **/script/socialconnect.js** and **behavior.js** scripts work together to enable facebook friends to interact with each other in real-time over hydna.

With this technique you can create collaborative experiences with your friends in real-time.

This is how it works:

### Facebook login

The user first logs in with facebook connect and then and approves our application. The user's friendslist is fetched to keep track of who the user is connected with.

### Connecting to hydna

The application then connects to hydna which has the [behavior](https://www.hydna.com/documentation/#behaviors) script in **behavior.js** attached to it's [domain](https://www.hydna.com/documentation/#using-hydna). For your own domain just copy the code in **behavior.js** file and paste it into the behaviour editor under your hydna domain.

Using our **SocialConnect** class found in **/script/socialconnect.js** you do the following:

    var socialconn = new SocialConnect('youdomain.hydna.net', 'facebook');
    // friendlist received from facebook api request
    socialconn.addFriends(friendlist);
    // userId and accessToken received from previous facebook login
    socialconn.connect(userId, accessToken);
    socialconn.onfriendopen = function(user){
        console.log("friend: "+user.id+" just connected");
    }
    socialconn.onfriendmessage = function(user, msg){
        console.log("friend: "+user.id+" just send the msg: "+msg);
    }
    socialconn.onfriendclose = function(user){
        console.log("friend: "+user.id+" just disconnected");
    }

If you have any questions or comments do not hestitate to contact us at info@hydna.com
