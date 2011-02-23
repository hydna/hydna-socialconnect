var app = {
    settings: {
        appid: '112642802144454',
        domainaddr: 'demo.hydna.net',
        rendevousaddr: 'demo.hydna.net/10000',
        permissions: { perms:'read_stream,publish_stream' }
    },
    
    facebookchannel: null,
    facebookapi: null,
    facebookconnected: false,
    
    init: function() {
        var self = this;
        this.facebookchannel = new SocialConnect(this.settings.domainaddr, this.settings.rendevousaddr);
        this.facebookapi = FB;
        
        this.facebookapi.init({
 		     appId  : this.settings.appid,
		     status : true,
		     cookie : true,
		     xfbml  : true
		});

        $('#logout').live('click', function(event) {
            event.preventDefault();
            self.logout();
        });

        $('#login').live('click', function(event) {
            event.preventDefault();
	        self.login(self.settings.permissions);
        });

        $('.poke').live('click', function(event) {
            event.preventDefault();
            $(this).siblings('.photo').effect("shake", { times: 8, distance: 5 }, 30);
            var to = $(this).parents('.user').attr('id');
            self.facebookchannel.send(to);
        });
		
		this.check_session();

        this.facebookchannel.onerror = function() {
            alert("Already connected!");
        }
    },
    
    check_session: function() {
      var self = this;
      
      this.facebookapi.getLoginStatus(function(response) {
			if (response.session) {
                // jk: there is a bug in the current getLoginStatus method
                // Facebook JavaScript SDK -- it doesn't return permissions as
                // expected. The best we can do is manually ask.
                self.facebookapi.api({
                    method : 'fql.query',
                    query : 'SELECT status_update,photo_upload,sms,offline_access,email,create_event,rsvp_event,publish_stream,read_stream,share_item,create_note,bookmarked,tab_added FROM permissions WHERE uid=' + self.facebookapi.getSession().uid
                },
                function(response) {
                    var perms = [];
                    for(perm in response[0]) {
                        if(response[0][perm] == '1') perms.push(perm);
                    }

                    self.facebookconnected = true;

                    self.fetchuserdetails();

                });
			} else {
			    $('#status').html( "Please log in ..." );
                $('#login').show();
			}
		});
    },
    
    login: function(opts) {
        var self = this;
        
        if (!opts) opts = {};

		this.facebookapi.login(function(response) {
            if (response.status == 'connected') {
                self.facebookapi.getLoginStatus(function(response) {
                    if(response.session) {
                        self.facebookconnected = true;
                        self.fetchuserdetails();
                    }
                }, true);
            }
		},opts);
    },
    
    logout: function() {
        var self = this;
        
	    this.facebookchannel.destroy();
	    this.facebookconnected = false;
        
        this.facebookapi.logout(function(response) {
            $('#main-panel').fadeOut(function() {
			    $('#status').html( "Please log in ..." );
                $('#login').show();
                $('#login-panel').fadeIn();
            });
            // handle logout complete
        });
    },
    
    fetchuserdetails: function() {
        var self = this;
        this.facebookapi.api('/me', function(user) {
            $('#user').html([
                '<img src="', 'http://graph.facebook.com/', user.id ,'/picture', '" class="photo"/>',
                '<span class="name">', user.name, '</span>',
                '<a href="#" id="logout">Log Out</a>'
            ].join('')).attr('rel', user.id);

            $('#login-panel').fadeOut(function() {
                $('#main-panel').fadeIn();
            });
          
            self.fetchfriends();
        });
    },
    
    fetchfriends: function() {
        var self = this;
        
        this.facebookapi.api('/me/friends', function(response) {
            if (response.data.length > 0) {
                self.connectfriends(response.data);
            }
        });
    },
    
    connectfriends: function(friends) {
        var self = this;
        
        this.facebookchannel.connect(this.facebookapi.getSession().uid, friends, "fb");

        // a friend connects
        this.facebookchannel.onfriendopen = function(user) {
            $('#loading-friends').hide();
            var friend = $([
                '<li id="', user.id, '" class="user clear">',
                '<img src="', 'http://graph.facebook.com/', user.id ,'/picture', '" class="photo"/>',
                '<span class="name">', user.name, '</span>',
                '<a class="poke" href="#">❮ Poke</a>',
                '</li>'
            ].join(''));
            friend.hide();
            $('#friends').prepend(friend);
            friend.fadeIn();
        }

        // when a friend logs out or closes app
        this.facebookchannel.onfriendclose = function(user) {
            $('#' + user.id).fadeOut(function() {
                $(this).remove();
                if ($('#friends li:not(#loading-friends)').length == 0) {
                    $('#loading-friends').show();
                }
            });
        }

        // whenever lookup is complete
        this.facebookchannel.onlookup = function(count) {
        }

        // when friend sends a message
        this.facebookchannel.onfriendmessage = function(msg, user) {
            if (msg == $('#user').attr('rel')) {
                $('#user .photo').effect("shake", { times: 8, distance: 5 }, 30);
            }
        }
    }
};
