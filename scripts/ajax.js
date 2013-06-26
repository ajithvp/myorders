var categorySelected = "Category";
var app = {
	initialize : function (){
		var self = this;
		if(!Store.isSet("appData." + Store.get("user").Userid)){
			this.getAppData(app.changePage);
		}
		else{
        	this.changePage();
		}
	},
	fetch : function (model){
		$.getJSON(url+model, function(data) {
			Store.set(model+"." + Store.get("user").Userid, data,0);
		});
	},
	getAppData : function(callback){
		$.mobile.loadingMessage = "Customers";
		$.mobile.showPageLoadingMsg();
		unBindEvents();
		var userid = Store.get("user").Userid;
		$.getJSON(url+"customers",{ "userid" : userid }, function(data) {
			$.each(data,function(i,record){
				record.order = 0;
			});
			Store.set("customers." + Store.get("user").Userid, data,0);
		}).done(function(){
			$.mobile.loadingMessage = "Products";
			$.mobile.showPageLoadingMsg();
			$.getJSON(url+"products", function(data) {
				Store.set("products." + Store.get("user").Userid, data,0);
			}).done(function(){
				var products = Store.get("products." + Store.get("user").Userid);
				var category = getDistinct(products,'pmCategory');
				Store.set("category." + Store.get("user").Userid, category,0);
				$.mobile.loadingMessage = "Loading..";
				bindEvents();
				$.mobile.showPageLoadingMsg();
				Store.set("appData." + Store.get("user").Userid,"1",0);
				callback();
			});
		})
	},
	changePage : function(){
		$.mobile.changePage( "#saleOrderSelectCustomer", {
            transition: "slide",
            reverse: false,
            changeHash: true
        });
        var customers = Store.get("customers." + Store.get("user").Userid);
        app.loadPage(customers);
        return false;
	},
	loadPage : function(customers){		
        customers = sortByKey(customers, 'order');
        var node;
        var store;
        var storename;
        var location;
        $('#ui-results').children(".added").remove();  
        $.each(customers,function(i,record){
        	if(i >= 10){
        		return false;
        	}
        	store = (record.smStoreName).split("-");
        	storename = record.smStoreName;
        	location = record.smStoreName;
        	if(typeof store[0] != "undefined"){
        		storename = $.trim(store[0]);
        	}
        	if(typeof store[1] != "undefined"){
        		location = $.trim(store[1]);
        	}
        	node = $(".template",$("#ui-results")).clone().removeClass("template");
        	$(".storeName",node).html(storename);
        	$(".storeCode",node).html(record.smStoreCode);
        	
        	$(".location",node).html(location);
        	$(".storeId",node).val(record.smId);
        	$(node).addClass("added");
        	$(node).appendTo("#ui-results");
        	$("#ui-results").show();
        });
        $(".customer").unbind('tap', orders.selectCustomer);
    	$(".customer").bind("tap", {page: "#saleOrderEntry"}, orders.selectCustomer);
       	$.mobile.hidePageLoadingMsg();
    	$("#txtUserName").val("");
    	$("#txtPassword").val("");
    	return false;
	},
	postData : function(data,param,callback){
		$.mobile.loadingMessageTextVisible = true;
		$.mobile.loadingMessage = "Sending..";
		$.mobile.showPageLoadingMsg();
		unBindEvents();
		var temp = [];
		if(Store.isSet(param + "." + Store.get("user").Userid)){
			temp = Store.get(param + "." + Store.get("user").Userid);
			Store.clear(param + "." + Store.get("user").Userid);
		}
		$.ajax({
    		type: "POST",
    		url: url + param,
    		data: data,
        	cache: false,
        	dataType: "html",
        	success: function(result){
        		data['savedStatus'] = "true";
        		data['referenceNo'] = result;
        		data['serialNo'] = temp.length + 1;
        		temp.push(data);
 	 			Store.set(param + "." + Store.get("user").Userid,temp,0);
        		callback(result);
        		bindEvents();
        		$.mobile.hidePageLoadingMsg();
        	},
        	error: function(){
        		temp = sortByKey(temp,"serialNo");
        		data['referenceNo'] = 0;
        		data['savedStatus'] = "false";        		
        		var isExisting = getObject(temp,"date",data['date']);
        		if(isExisting){
        			data['serialNo'] = temp[isExisting]['serialNo'];
        			temp.splice(isExisting,1); 
        		}else{
        			if(typeof temp[temp.length-1] == "undefined")
        				data['serialNo'] = temp.length + 1;
        			else	
        				data['serialNo'] = temp[temp.length-1]['serialNo'] + 1;
        		}
        		temp.push(data);
 	 			Store.set(param + "." + Store.get("user").Userid,temp,0);
        		callback(0);
        		bindEvents();
        		$.mobile.hidePageLoadingMsg();
        	}
  		});
	}
}
function showNotice(param){
	if(param != 0){
		$("#savedOrder").find(".result").html("Successfully Saved");
		$("#savedOrder").find(".reference").html("Order no. is " + param);
	}else{
		$("#savedOrder").find(".result").html("Saved Locally");
		$("#savedOrder").find(".reference").html("");
	}
	$.mobile.changePage( "#savedOrder", {
    	transition: "slide",
        reverse: false,
        changeHash: true
    });
}
var orders = {
	pendingOrders : [],
	products : [],
	savedOrders : [],
	viewOrder : function(){
		editMode = false;
		var storeId = $(this).find('input.storeId').val();
		var serialNo = $(this).find('input.serialNo').val();
		var storeName = $(this).find('span.storeName').html();
		var location = $(this).find('span.location').html();
		var storeCode = $(this).find('span.storeCode').html();
		$("#saleOrderEntry").find('.storeId').val(storeId);
		$("#saleOrderEntry").find('.storeName').html(storeName);
		$("#saleOrderEntry").find('.location').html(location);
		$("#saleOrderEntry").find('.storeCode').html(storeCode);
		
		var temp = getObject(Store.get("order." + Store.get("user").Userid),"serialNo",serialNo);
		orders.savedOrders = Store.get("order." + Store.get("user").Userid)[temp];
		$.mobile.changePage( "#saleOrderEntry", {
            transition: "slide",
            reverse: true,
            changeHash: true
        });
        return false;
		
	},
	selectCustomer : function(){
		editMode = true;
		var storeId = $(this).find('input.storeId').val();
		var storeName = $(this).find('strong.storeName').html();
		var location = $(this).find('span.location').html();
		var storeCode = $(this).find('span.storeCode').html();
		
		var order = {  'storeId' : storeId,
						'storeName' : storeName,
						'location' : location,
						'storeCode' : storeCode,
						'items' : []
					}
		var selectedIndex = getObject(orders.pendingOrders,'storeId',storeId);
		if(!selectedIndex){
			orders.pendingOrders.push(order);
			selectedIndex = orders.pendingOrders.length - 1;
		}
		for(i in orders.pendingOrders){
			orders.pendingOrders[i]['selectedOrder'] = false;
			if(i == selectedIndex){
				orders.pendingOrders[i]['selectedOrder'] = true;
			}
		}
		
		$("#saleOrderEntry").find('.storeId').val(storeId);
		$("#saleOrderEntry").find('.storeName').html(storeName);
		$("#saleOrderEntry").find('.location').html(location);
		$("#saleOrderEntry").find('.storeCode').html(storeCode);
		
		$.mobile.changePage( "#saleOrderEntry", {
            transition: "slide",
            reverse: true,
            changeHash: true
        });
        return false;
	},
	removeItem : function (){
		var productId = $(this).parent().find(".productId").val();
		var selectedIndex = getObject(orders.pendingOrders,'selectedOrder',true);
		var selectedItem = getObject(orders.pendingOrders[selectedIndex].items,'productId',productId); 
		orders.pendingOrders[selectedIndex].items.splice(selectedItem,1);
		$('#editItem').popup("close");
		$.each($("#ui-items").find("li"),function(i){
			if($(this).find(".productId").val() == productId){
				$(this).remove();	
			}
		});
		return false;
	},
	addProduct : function(){		
		alert("addproduct")
		if($(this).hasClass('addproduct')){
			$.mobile.changePage( "#enterProducts", {
            	transition: "slide",
            	reverse: false,
            	changeHash: true
        	});
        	alert("addproduct buton");
        	$("#enterProducts").find("#category").val(categorySelected).change();
			$("#enterProducts").find("#productId").val("");
			$("#enterProducts").find("#product").val("");
			$("#enterProducts").find("#quantity").val("");
			$("#enterProducts").find("#offerquantity").val("");	
			alert("addproduct buton");
		}else{
			if($(this).parent().find(".productId").val() !== "" ){
				alert("edit");
				var selectedIndex;
				var selectedItem;
				var item;
				var productId = $(this).parent().find(".productId").val();
				if(editMode){
					selectedIndex = getObject(orders.pendingOrders,'selectedOrder',true);
					selectedItem = getObject(orders.pendingOrders[selectedIndex].items,'productId',productId); 
					item = orders.pendingOrders[selectedIndex].items[selectedItem];
				}else{
					selectedItem = getObject(orders.savedOrders.items,'productId',productId);
					item = orders.savedOrders.items[selectedItem];
				}
				
				$.mobile.changePage( "#enterProducts", {
            		transition: "slide",
            		reverse: true,
            		changeHash: true
        		});
        		alert("after transition");
				$("#enterProducts").find("#category").val(item.category).change();
				$("#enterProducts").find("#productId").val(item.productId);
				$("#enterProducts").find("#product").val(item.productName);
				$("#enterProducts").find("#quantity").val(item.quantity);
				$("#enterProducts").find("#offerquantity").val(item.offerquantity);	
				alert("after setting values");
			}else{
			alert("else");
				$.mobile.changePage( "#enterProducts", {
            		transition: "slide",
            		reverse: false,
            		changeHash: true
        		});
        		alert("after transition");
        		$("#enterProducts").find("#category").val(categorySelected).change();
				$("#enterProducts").find("#productId").val("");
				$("#enterProducts").find("#product").val("");
				$("#enterProducts").find("#quantity").val("");
				$("#enterProducts").find("#offerquantity").val("");	
				alert("setting values");
        	}
		}
		
        return false;
	},
	validateItem : function(){
		if($("#category option:selected").text() == 'Category'){
			throw "Invalid category";
			return false;
		}
		if($.trim($("#product").val()) == ''){
			throw "Invalid product";
			return false;
		}
		if($("#productId").val() == '' && $.trim($("#product").val()) == ''){
			throw "Product not selected";
			return false;
		}
		if($.trim($("#quantity").val()) == '' || isNaN($.trim($("#quantity").val()))){
			$("#quantity").val('');
			throw "Product not selected";
			return false;
		}
		if(isNaN($.trim($("#offerquantity").val()))){
			$("#offerquantity").val('');
			throw "Invalid offer quantity";
			return false;
		}
	},
	addItem : function(){
		var selectedIndex = getObject(orders.pendingOrders,'selectedOrder',true);
		var selectedItem = getObject(orders.pendingOrders[selectedIndex].items,'productId',$("#productId").val()); 
		if(selectedItem){
			orders.pendingOrders[selectedIndex].items.splice(selectedItem,1);
		}
		try{
			orders.validateItem();
			var item = { 'productId' : $("#productId").val(),
					 'productName' : $("#product").val(),
					 'category' : $("#category option:selected").text(),
					 'quantity' : $("#quantity").val(),
					 'offerquantity' : $("#offerquantity").val()		
					};
			orders.pendingOrders[selectedIndex].items.push(item);
			$("#productId").val('');
			$("#product").val('');
			//$("#category").val('Category').change();
			$("#quantity").val('');
			$("#offerquantity").val('');
		}catch(e){
			navigator.notification.alert(e,callBackFunc, 'Error');
			throw e;
		}
		
		return false;
	},
	finish : function(){
		if($.trim($("#product").val()) == '' && ($.trim($("#quantity").val()) == '' || $.trim($("#offerquantity").val()) == '' ) ){
			$.mobile.changePage( "#saleOrderEntry", {
           		transition: "slide",
           		reverse: false,
           		changeHash: true
        	});
		}
		else{
			try{
				orders.addItem();
				$.mobile.changePage( "#saleOrderEntry", {
            		transition: "slide",
            		reverse: false,
            		changeHash: true
        		});
			}
			catch(e){
				return false;
			}
		}
        return false;
	},
	saveOrder : function(){
		var selectedIndex = getObject(orders.pendingOrders,'selectedOrder',true);
		if(orders.pendingOrders[selectedIndex].items.length == 0){
			navigator.notification.alert("No item to save",callBackFunc, 'Error');
			return false;
		}
		var selectedOrder = orders.pendingOrders[selectedIndex];
		selectedOrder["date"] = Date.now();
		delete selectedOrder["selectedOrder"];
		app.postData(selectedOrder,"order",showNotice);
		orders.pendingOrders.splice(selectedIndex,1);
		return false;
	},
	selectCategory : function(){
		$("#product").val("");
		$('#ui-results-products').children(".added").remove();
		categorySelected = $(this).find("option:selected").text();
		orders.products = getObjects(Store.get("products." + Store.get("user").Userid),"pmCategory",categorySelected,"exact");
		$("#product").focus();
		return false;
	},
	searchProduct : function(){
		if($("#category option:selected").text() == 'Category'){
			navigator.notification.alert("Select Category first",callBackFunc, 'Error');
			return false;
		}
	
		if($.trim($(this).val()).length == 0){
			return false;
		}
		var results = getObjects(orders.products,"pmProductName",$.trim($(this).val()));
		var node;
		$('#ui-results-products').children(".added").remove();
		$.each(results,function(i,record){
        	if(i >= 10){
        		return false;
        	}
        	node = $(".template:first",$("#ui-results-products")).clone().removeClass("template");
        	$(".productName",node).html(record.pmProductName);
        	$(".productCode",node).html(record.pmProductCode);
        	$(".productId",node).val(record.pmProductId);
        	$(node).addClass("added");
        	$(node).appendTo("#ui-results-products");
        });
        $(".products").unbind('tap', orders.selectProduct).bind('tap', orders.selectProduct);
        
        return false;
	},
	selectProduct : function(){
		var productId = $(this).find('input.productId').val();
		var productName = $(this).find('strong.productName').html();
		$("#product").val(productName);
		$("#productId").val(productId);
		$('#ui-results-products').children(".added").remove();
		$("#quantity").focus();
		return false;
	}
	
}

function onSuccess(data){
    if(data.Name != undefined){
    	Store.set("user",data,stayloggedin);
    	app.initialize();      
    }
    else{
    	$.mobile.hidePageLoadingMsg();
        navigator.notification.alert("Incorrect Login",callBack,'Error');
        $("#txtUserName").val("");
        $("#txtPassword").val("");
    }
}


function login(event) {	
	event.preventDefault();
	var username = $("#txtUserName").val().trim();
    var password = $("#txtPassword").val().trim();
   
    if(username == "" || password == ""){
		navigator.notification.alert("Please Fill The Details Completely",callBackFunc, 'Error');
    	return false;
    }
    $.mobile.loadingMessageTextVisible = true;
    $.mobile.loadingMessage = "Login";
    $.mobile.loadingMessageTheme = "c";
    $.mobile.showPageLoadingMsg();
    $.ajax({
    	type: "POST",
    	url: url + "do_login",
    	data: {
        	'username':username,
            'password':password
        },
        cache: true,
        dataType: "json",
        success: onSuccess,
        error: onerror
  	});
    return false;
}


function onerror(data){
    navigator.notification.alert("Error In Your Internet Connection",callBackFunc,'Error');
    $.mobile.hidePageLoadingMsg();
    $("#txtUserName").val("");
    $("#txtPassword").val("");
}

function callBackFunc(){
}
