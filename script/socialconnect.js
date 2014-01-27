window.SocialConnect = (function() {

var ALREADY_CONNECTED = "already_connected";
var INVALID_TOKEN = "invalid_token";
var CLAIM_FIRST = "claim_first";
var AUTH_PROBLEM = "facebook_auth_error";

var SUPPORTED_NETWORKS = ["facebook"];

function SocialConnect(domainaddr, socialnetwork){
     
    var self = this;
    self._socialnetwork = socialnetwork;
    self._me_channel = null;
    self._uuid = "";
    self._domain_addr = domainaddr;
    self._connected = false;
    self._connecting = false;
    self._public_connected = false;
    self._connected_friends = {};
    self._friends = [];
    self._public_channel = null;
    self._message_que = {};
}

SocialConnect.prototype.connect = function(uuid, token){
    
    var self = this;

    if(!self._connected && !self._connecting){
        self._connecting = true;
               
        self._uuid = uuid;

        self._me_channel = new HydnaChannel(self._domain_addr+"/"+self._socialnetwork+"/"+self._uuid+"?"+token, 'r');
        self._me_channel.onopen = function(event){
            self._connected = true;
            self._connecting = false;
            self.connectPublic();
        }

        self._me_channel.onclose = function(event){
            if(event.wasDenied){
                self.onerror && self.onerror(event.reason);
            }
        }

        self._me_channel.onsignal = function(event){
            var msg = null;
            
            try{
                var msg = JSON.parse(event.data);
            }catch(e){}
            
            if(msg !== null){
                if('type' in msg){
                    if(msg.type === 'ping' && msg.data !== self._uuid){
                        self.connectFriend(msg.data);
                    }
                    if(msg.type === 'close' && msg.data !== self._uuid){
                        self.disconnectFriend(msg.data);
                    }
                }
            }
        }

        self._me_channel.onmessage = function(event){
            var msg = null;
            
            try{
                msg = JSON.parse(event.data);
            }catch(e){}

            if(msg !== null){
                self.onfriendmessage && self.onfriendmessage(self.getFriendProperties(msg.id), msg.data);
            }
        }
    }
}

SocialConnect.prototype.connectPublic = function(){
    var self = this;
    if(!self._public_channel){
        self._public_channel = new HydnaChannel(self._domain_addr+"/"+self._socialnetwork+"?"+self._uuid);
        self._public_channel.onopen = function(event){
            self._public_connected = true;
        }

        self._public_channel.onclose = function(event){
            if(event.wasDenied){
                self.onerror && self.onerror(event.reason);
            }
        }

        self._public_channel.onsignal = function(event){
            var msg = null;

            try{
                var msg = JSON.parse(event.data);
            }catch(e){}

            if(msg != null){
                if('type' in msg){
                    if(msg.type === 'joined' && msg.data !== self._uuid){
                        self.connectFriend(msg.data);
                    }
                    if(msg.type === 'left' && msg.data !== self._uuid){
                        self.disconnectFriend(msg.data);
                    }
                }
            }
        }
    }
}

SocialConnect.prototype.send = function(msg){
    // send msg to friends, add to que of not connected
    if(this._connected){
        for(var id in this._connected_friends){
            var friend = this._connected_friends[id];
            if(friend.readyState === HydnaChannel.OPEN){
                friend.send(JSON.stringify({id:this._uuid, data: msg}));
            }else{
                if(this._message_que[id] != null){
                    this._message_que[id].push(msg);
                }else{
                    this._message_que[id] = [msg];
                }
            }
        }
    }else{
        throw(new Error("Not connected"));
    }
}

SocialConnect.prototype.addFriends = function(friends){
    this._friends = friends;
}

SocialConnect.prototype.disconnectFriend = function(id){

    if(this._connected_friends[id]){
        this._connected_friends[id].close();
        this._connected_friends[id] = null;
    }
}

SocialConnect.prototype.connectFriend = function(id){
    var self = this;

    if(!self.isFriendListed(id)){
        self.onerror && self.onerror("This is not your friend");
        return;
    }
    
    if(self._connected && !self._connected_friends[id]){
        var friendChannel = new HydnaChannel(self._domain_addr+"/"+self._socialnetwork+"/"+id, 'w');
        friendChannel.onopen = function(event){
            if(self._message_que[id] != null){
                for(var i in self._message_que[id]){
                    friendChannel.send(JSON.stringify({id:id, data: self._message_que[id][i]}));
                }

                self._message_que[id] = null;
            }
		    self.onfriendopen && self.onfriendopen(self.getFriendProperties(id));
        }
        
        friendChannel.onclose = function(event){
            if(!event.wasDenied){
                self.onfriendclose && self.onfriendclose(self.getFriendProperties(id));
                self._message_que[id] == null;
            }
        }

        friendChannel.onsignal = function(event){
            var msg = null;

            try{
                var msg = JSON.parse(event.data);
            }catch(e){}

            if(msg != null){
                if('type' in msg){
                    if(msg.type === 'joined' && msg.data !== self._uuid){
                        self.connectFriend(msg.data);
                    }
                    if((msg.type === 'left' || msg.type === 'close') && msg.data !== self._uuid){
                        self.disconnectFriend(msg.data);
                    }
                }
            }
        }

        self._connected_friends[id] = friendChannel;
    }
}


SocialConnect.prototype.getConnectedFriends = function(){
	
	var friends = [];
	
	for(var i in this._connected_friends){
		if(this._connected_friends[i].readyState === HydnaChannel.OPEN){
			var friendobj = {id: id};
			friends.push(this.getFriendProperties(id));
		}
	}
	
	return friends;
}

SocialConnect.prototype.isFriendListed = function( id ){
	for(var i in this._friends){
        if(this._friends[i].id === id){
            return true;
        }
    }
    return false;	
}

SocialConnect.prototype.getFriendProperties = function(id){
    for(var i in this._friends){
        if(this._friends[i].id === id){
            return this._friends[i];
        }
    }

    return null;
}

SocialConnect.prototype.destroy = function(){
	
	if(this._connected){
		if(this._me_channel !== null){
			this._me_channel.close();
            this._me_channel = null;
		}
		
        for(var i in this._connected_friends){
			this._connected_friends[i].close();
			this._connected_friends[i] = null;
		}

        if(this._public_channel !== null){
            this._public_channel.close();
            this._public_channel = null;
        }
		
        this._message_que = {};
        this._public_connected = false;
		this._connected = false;
		this._connecting = false;
		this._connected_friends = {};
		this._friends = [];
	}
}

return SocialConnect;
})();
