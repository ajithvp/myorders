/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
var url;
var stayloggedin = 0;
var editMode = true;
var ordersSaved = 0;
var orderToSync = 0;
var ordersSynced = 0;

$(document).bind("mobileinit", function() {            
	$.mobile.touchOverflowEnabled = true; 
	$.mobile.defaultPageTransition = 'none'; 
	$.mobile.defaultDialogTransition = 'none';
	$.mobile.loadingMessageTextVisible = true; 
	$.mobile.buttonMarkup.hoverDelay = 0;
});

$(document).on('pagebeforeshow', '#saleOrderSelectCustomer',  function(){
	url = "http://www.getmyorder.in/index.php/ajax/";
	//url = "http://localhost/projects/getmyorder.in/index.php/ajax/";
	if(!Store.isSet("user")){
    	$.mobile.changePage("#login", {
    		transition: "slide",
    		changeHash: false,
    		reverse: false
    	});    
    	return false;
    }
}); 
$(document).delegate('#saleOrderSelectCustomer', 'pageinit', function() {
	url = "http://www.getmyorder.in/index.php/ajax/";
	//url = "http://localhost/projects/getmyorder.in/index.php/ajax/"; 
   	if(!Store.isSet("user")){
    	$.mobile.changePage("#login", {
    		transition: "slide",
    		changeHash: false,
    		reverse: false
    	});
    	return false;
    }
    onResize();
    $(window).off('resize').on('resize', onResize);
    app.initialize();
    bindEvents();
    return false;

}).delegate('#saleOrderSelectCustomer', 'pageshow', function() {
    return false;
}).delegate('#saleOrderEntry', 'pageshow', function() {
	var selectedOrder;
	var quantity;
	if(editMode){
		var selectedIndex = getObject(orders.pendingOrders,'selectedOrder',true);
		selectedOrder = orders.pendingOrders[selectedIndex].items;
	}else{
		selectedOrder = orders.savedOrders.items;
	}
	
	$('#ui-items').children(".added").remove();  
	$.each(selectedOrder,function(i,record){
		node = $(".template",$("#ui-items")).clone().removeClass("template");
        $(".productName",node).html(record.productName);
        $(".category",node).html(record.category);
        if(record.offerquantity == 0 || record.offerquantity == ''){
        	quantity  = "Qty " + record.quantity;
        }
        else{
        	quantity  = "Qty " + record.quantity + "/" + record.offerquantity;
        }
        $(".quantity",node).html(quantity);
        $(".productId",node).val(record.productId);
        $(node).addClass("added");
        $(node).appendTo("#ui-items");
	});
    return false;
}).delegate('#saleOrders', 'pageshow', function() {
	var orders = Store.get("order." + Store.get("user").Userid);
	var totalOrders = 0;
	var todaysOrders = 0;
	var savedOrders = 0;
	var orderNo = 0;
	var today = Date.now();
	$('#ui-orders').children(".added").remove();
	if(orders){
		$.each(orders,function(i,record){
			totalOrders++;
			if(Math.abs((today-record.date)/(60*60*24*1000)).toFixed(0)==0){
				todaysOrders++;
			}
			if(record.savedStatus){
				savedOrders++;
				orderNo = record.referenceNo;
			}else{
				orderNo = "";
			}
			node = $(".template",$("#ui-orders")).clone().removeClass("template");
        	$(".orderno",node).html("Order No : " + orderNo);
        	$(".storeName",node).html(record.storeName);
        	$(".storeCode",node).html(record.storeCode);
        	$(".location",node).html(record.location);
        	$(".storeId",node).val(record.storeId);
        	$(".serialNo",node).val(record.serialNo);
        	$(node).addClass("added");
        	$(node).appendTo("#ui-orders");
		});
	}
	$("#totalOrders").html("Total Orders : " + totalOrders);
	$("#todaysOrders").html("Todays Orders : " + todaysOrders);
    return false;
}).delegate('#login', 'pageshow', function() {
	$("#btnLogin").unbind('tap',login).bind('tap',login);
	$("input[type='radio']").bind( "change", function(event) {
 		if($("on").attr("checked") == "checked"){
 			stayloggedin = 0;
 		}else{
 			stayloggedin = 180000;
 		} 		
 	});
    return false;
}).delegate('#settings', 'pageshow', function() {
    bindEvents();
    return false;
}).delegate('#savedOrder', 'pageshow', function() {
	$("#btnExit").off("tap").on("tap",function(event){
		event.preventDefault();
		try{
			navigator.app.exitApp();
			navigator.device.exitApp();
		}
		catch(e){
		}
	});
    return false;
}).delegate('#enterProducts', 'pageshow', function() {
	var category = Store.get("category." + Store.get("user").Userid);
	$("#category").html("");
	$("<option>Category</option>").appendTo("#category");
	$.each(category,function(i,data){
		$("<option>"+data+"</option>").appendTo("#category");
	});
	if(editMode){
		$("#btnBack").closest("div").hide();
		$("#btnAddNext").closest("div").show();
		$("#btnFinish").closest("div").show();
	}else{
		$("#btnBack").closest("div").show();
		$("#btnAddNext").closest("div").hide();
		$("#btnFinish").closest("div").hide();	
	}	
    bindEvents();
    return false;
});


function searchCustomer(event){
	event.preventDefault();
	var customers = Store.get("customers." + Store.get("user").Userid);
	if($.trim($(this).val()).length == 0){
		return false;
	}
	customers = getObjects(customers,'smStoreName',$(this).val());
	app.loadPage(customers);
	return false;
}
function refreshAppData(event){
	event.preventDefault();
	$("#sure .sure-1").text("Are You Sure?");
  	$("#sure .sure-2").text("Are you sure refresh application data?");	
	$('#sure').popup("open");
	$("#suredo").unbind("tap").bind("tap",function(){
		Store.clear("appData." + Store.get("user").Userid);
		Store.clear("customers." + Store.get("user").Userid);
		Store.clear("category." + Store.get("user").Userid);
		Store.clear("products." + Store.get("user").Userid);
		app.getAppData(closePopUp);
		return false;
	});
	return false;	
}

function syncOrders(event){
	event.preventDefault();
	ordersSaved = 0;
	ordersSynced = 0;
	var orders = Store.get("order." + Store.get("user").Userid);
	var unSavedOrders = getObjects(orders,"savedStatus","false","exact");
	orderToSync = unSavedOrders.length;
	$.each(unSavedOrders,function(i,record){
		delete record['referenceNo'];
		delete record['savedStatus'];
		delete record['serialNo'];
		app.postData(record,"order",countSyncOrders);
	})
	return false;
}

function countSyncOrders(param){
	ordersSynced++;
	if(param != 0)
		ordersSaved++;
	if(ordersSynced == orderToSync){
		navigator.notification.alert("Saved " + ordersSaved + " Orders",callBackFunc, 'Notice');
	} 
}

function closePopUp(){
	navigator.notification.alert("Done!!",callBackFunc, 'Done');
	$.mobile.hidePageLoadingMsg();
	$('#sure').popup("close");
}

function unBindEvents(){
	$(".back").unbind("tap");
	
	$("#refreshAppData").off('tap');
	
	$("#syncOrders").off('tap');
	
	$("#searchCustomer").off('keyup',searchCustomer);
	
    $(".ui-collapsible").off('tap', collapse);

    $(".logout").unbind("tap", logout);
    
    $(".settings").unbind("tap");
    
    $("#btnCancel").unbind("tap");    

    $(".home").unbind("tap");

    $(".closebutton").unbind('tap', navigate);
    
    $("#btnBack").unbind('tap', navigate);

    $(".viewOrder").unbind("tap",orders.viewOrder);
	
	$(".viewItem").unbind('tap',showViewPopUp);
	$(".addproduct").unbind('tap');
	$(".editItem").unbind('tap',showEditPopUp);
	$("#removeEntry").unbind('tap');
	$("#editEntry").unbind('tap');
	$("#btnSave").unbind('tap', orders.saveOrder);
	
	
    $("#btnFinish").unbind('tap', orders.finish);
    
    $("#btnAddNext").unbind('tap');

    $("#btnNextOrder").unbind('tap', navigate);

    $(".orders").unbind('tap', navigate);
	
	$("#category").unbind('change',orders.selectCategory);
	
	$("#product").unbind('keyup',orders.searchProduct);

}

function bindEvents() {
	
	$(".back").unbind("tap").bind("tap", {page: "#saleOrderSelectCustomer"}, navigate);   
	
	$("#refreshAppData").off('tap').on('tap', refreshAppData);
	
	$("#syncOrders").off('tap').on('tap', syncOrders);
	
	$("#searchCustomer").off('keyup',searchCustomer).on('keyup',searchCustomer);
	
    $(".ui-collapsible").off('tap', collapse).on('tap', collapse);

    $(".logout").unbind("tap", logout).bind("tap", logout);
    
    $(".settings").unbind("tap").bind("tap", {page: "#settings"}, navigate);
    
    $("#btnCancel").unbind("tap").bind("tap", {page: "#saleOrderSelectCustomer"}, navigate);    

    $(".home").unbind("tap").bind("tap", {page: "#saleOrderSelectCustomer"}, navigate);

    $(".closebutton").unbind('tap', navigate).bind("tap", {page: "#saleOrderSelectCustomer"}, navigate);
    
    $("#btnBack").unbind('tap', navigate).bind("tap", {page: "#saleOrderEntry"}, navigate);

    $(".viewOrder").unbind("tap",orders.viewOrder).bind("tap",orders.viewOrder);
	if(editMode){
		$(".viewItem").unbind('tap',showViewPopUp);
		$(".addproduct").unbind('tap').bind("tap", {page: "#enterProducts"}, orders.addProduct);
		$(".editItem").unbind('tap',showEditPopUp).bind('tap',showEditPopUp);
		$("#removeEntry").unbind('tap').bind('tap',orders.removeItem);
		$("#editEntry").unbind('tap').bind('tap',orders.addProduct);
		$("#btnSave").unbind('tap', orders.saveOrder).bind("tap", orders.saveOrder);
	}else{
		$(".addproduct").unbind('tap');
		$(".editItem").unbind('tap',showEditPopUp);
		$(".viewItem").unbind('tap',showViewPopUp).bind('tap',showViewPopUp);
		$("#btnSave").unbind('tap', orders.saveOrder);
		$("#viewEntry").unbind('tap').bind('tap',orders.addProduct);
	}
	
    $("#btnFinish").unbind('tap', orders.finish).bind("tap", orders.finish);
    
    $("#btnAddNext").unbind('tap').bind("tap", orders.addItem);

    $("#btnNextOrder").unbind('tap', navigate).bind("tap", {page: "#saleOrderSelectCustomer"}, navigate);

    $(".orders").unbind('tap', navigate).bind("tap", {page: "#saleOrders"}, navigate);
	
	$("#category").unbind('change',orders.selectCategory).bind('change',orders.selectCategory);
	
	$("#product").unbind('keyup',orders.searchProduct).bind('keyup',orders.searchProduct);

}
function logout(event){
	event.preventDefault();
	Store.clear("user");
	$.mobile.changePage( "#login", {
    	transition: "slide",
        reverse: false,
        changeHash: false
    });
    return false;
}

function showEditPopUp(event){
	event.preventDefault();
	$('#editItem').find(".ui-first-child").html($(this).find(".productName").html());
	$('#editItem').find(".productId").val($(this).find(".productId").val());
	$('#editItem').popup("open");
	return false;
}

function showViewPopUp(event){
	event.preventDefault();
	$('#viewItem').find(".ui-first-child").html($(this).find(".productName").html());
	$('#viewItem').find(".productId").val($(this).find(".productId").val());
	$('#viewItem').popup("open");
	return false;
}

function onResize() {
    var tolerance = 25;
    var portraitScreenHeight;
    var landscapeScreenHeight;

    if (window.orientation === 0 || window.orientation === 180) {
        potraitScreenHeight = $(window).height();
        landscapeScreenHeight = $(window).width();
    }
    else {
        portraitScreenHeight = $(window).width();
        landscapeScreenHeight = $(window).height();
    }
    if ((window.orientation === 0 || window.orientation === 180) && ((window.innerHeight + tolerance) < portraitScreenHeight)) {
        $("[data-role=footer]").removeAttr("data-position");
    }
    else if ((window.innerHeight + tolerance) < landscapeScreenHeight) {
	    $("[data-role=footer]").removeAttr("data-position");
    }
    else {
    	$("[data-role=footer]").attr("data-position","fixed");
    }
    $("#searchResults").height($(window).height() - $("#searchResults").offset().top - $("#footer").height() - 17);
    $(".ui-link-inherit").width($(window).width() - 100);
}

function navigate(event) {
    event.preventDefault();
    $.mobile.showPageLoadingMsg();
    var transition = (event.data.transition === undefined) ? "slide" : event.data.transition;
    var hash = (event.data.hash === undefined) ? true : event.data.hash;
    var reverse = (event.data.reverse === undefined) ? false : event.data.reverse;
    $.mobile.changePage(event.data.page, {
        transition: transition,
        changeHash: hash,
        reverse: reverse
    });
    $.mobile.hidePageLoadingMsg();
    return false;
}

function collapse(event) {
	event.preventDefault();
    if ($(this).hasClass('ui-collapsible-collapsed')) {
        $(this).removeClass('ui-collapsible-collapsed');
        $(this).find("span.ui-icon").removeClass("ui-icon-plus");
        $(this).find("span.ui-icon").addClass("ui-icon-minus");
        $(this).children("div.ui-collapsible-content").removeClass("ui-collapsible-content-collapsed");
    } else {
        $(this).addClass('ui-collapsible-collapsed');
        $(this).find("span.ui-icon").removeClass("ui-icon-minus");
        $(this).find("span.ui-icon").addClass("ui-icon-plus");
        $(this).children("div.ui-collapsible-content").addClass("ui-collapsible-content-collapsed");
    }
    return false;
}
