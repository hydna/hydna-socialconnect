ocialConnect behavior
*
*/
const ALREADY_CONNECTED = "already_connected";
const INVALID_TOKEN = "invalid_token";
const CLAIM_FIRST = "claim_first";
const AUTH_PROBLEM = "facebook_auth_error";

// token is uid
behavior('/facebook', {
    open: function(event){
        if(!event.token){
            event.deny(INVALID_TOKEN);
        }
        
        event.domain.get("facebook:"+event.token, function(err, value) {
            if (!err && value != null && event.connection.id === value) {
                event.connection.set("facebook-uid", event.token);
                event.channel.emit(JSON.stringify({type:'joined', data:event.token}));
                event.allow();
            }
            event.deny(CLAIM_FIRST);
        });
    },
    
    close: function(event){
        event.connection.get("facebook-uid", function(err, value){
            if(!err && value != null){
                event.channel.emit(JSON.stringify({type:'left', data: value}));        
            } 
        });
    }
});

// token is facebook token
behavior('/facebook/{uid}', {
    open: function(event) {
        // also check mode
        // check if owner, othwerwise emit to owner?
        event.domain.get("facebook:"+event.params.uid, function(err, value){
            // if we get something back, this is already set
            if(!err && value != null){
                // there is an owner just listen
                event.connection.get("facebook-uid", function(err, value){
                    if(!err && value != null && value == event.params.uid){
                        event.deny("already_connected");
                    }
                    event.channel.emit(JSON.stringify({type:'ping', data: value}));
                    event.allow();
                });
            }
            
            if(!event.token){
                event.deny(INVALID_TOKEN);
            }
            
            http.get('https://graph.facebook.com/'+event.params.uid+'?access_token='+event.token, function(err, body){
                if(!err){
                    
                    var response = null;
                    try{
                        response = JSON.parse(body);
                    }catch(e){}
                    
                    if(response != null){
                        if(!response.error){
                            event.domain.set("facebook:"+event.params.uid, event.connection.id);
                            event.allow();
                        }
                    }
                }
                
                event.deny(AUTH_PROBLEM);
                
            });
        });
    },
    
    close: function(event){
        // if you are owner remove owner from channel
        event.domain.get("facebook:"+event.params.uid, function(err, value){
            if(!err && value != null && value === event.connection.id){
                event.domain.del("facebook:"+event.params.uid);
                event.channel.emit(JSON.stringify({'close': event.params.uid}));
            }
        });
    }
});
